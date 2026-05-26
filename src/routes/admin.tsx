import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, GraduationCap, Plus, Download, Users, CheckCircle2, Clock, AlertCircle, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import { exportToExcel } from "@/lib/export";
import { adminConfig } from "@/config/adminConfig";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSignupCode, updateAdminSignupCode } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({ component: AdminPanel });

interface InternRow {
  id: string;
  name: string;
  email: string;
  mobile: string;
  internship_domain: string;
  onboarding_step: number;
}
interface Task {
  id: string;
  intern_id: string;
  title: string;
  description: string | null;
  sequence_order: number;
  status: "locked" | "in_progress" | "pending_approval" | "approved" | "rejected";
  submission: string | null;
  feedback: string | null;
  submitted_at: string | null;
}

function AdminPanel() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [interns, setInterns] = useState<InternRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");

  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    // Get all interns (anyone with intern role)
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "intern");
    const internIds = (roles ?? []).map((r) => r.user_id);
    if (internIds.length === 0) { setInterns([]); setTasks([]); return; }
    const [{ data: profs }, { data: ts }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", internIds),
      supabase.from("tasks").select("*").in("intern_id", internIds).order("sequence_order"),
    ]);
    setInterns((profs ?? []) as InternRow[]);
    setTasks((ts ?? []) as Task[]);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (!isAdmin) { nav({ to: "/" }); return; }
    load();
  }, [user, loading, isAdmin, nav, load]);

  const internTasks = (id: string) => tasks.filter((t) => t.intern_id === id);

  const addTask = async (internId: string) => {
    if (!newTask.title.trim()) return toast.error("Title required");
    const existing = internTasks(internId);
    const nextSeq = existing.length + 1;
    // First task auto-unlocks if no tasks yet, else locked
    const status = existing.length === 0 ? "in_progress" : "locked";
    const { error } = await supabase.from("tasks").insert({
      intern_id: internId,
      title: newTask.title,
      description: newTask.description,
      sequence_order: nextSeq,
      status,
    });
    if (error) return toast.error(error.message);
    toast.success("Task added");
    setNewTask({ title: "", description: "" });
    load();
  };

  const approve = async (task: Task) => {
    const { error } = await supabase.from("tasks").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      feedback: feedback[task.id] ?? "",
    }).eq("id", task.id);
    if (error) return toast.error(error.message);
    // Unlock next sequential task
    const next = tasks.find((t) => t.intern_id === task.intern_id && t.sequence_order === task.sequence_order + 1);
    if (next && next.status === "locked") {
      await supabase.from("tasks").update({ status: "in_progress" }).eq("id", next.id);
    }
    toast.success("Approved");
    load();
  };

  const reject = async (task: Task) => {
    if (!feedback[task.id]?.trim()) return toast.error("Add rejection feedback");
    const { error } = await supabase.from("tasks").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      feedback: feedback[task.id],
    }).eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success("Rejected with feedback");
    load();
  };

  const exportAll = async () => {
    const rows = interns.map((i) => {
      const its = internTasks(i.id);
      return {
        Name: i.name,
        Email: i.email,
        Mobile: i.mobile,
        Domain: i.internship_domain,
        OnboardingComplete: i.onboarding_step >= 4 ? "Yes" : "No",
        TotalTasks: its.length,
        Approved: its.filter((t) => t.status === "approved").length,
        Pending: its.filter((t) => t.status === "pending_approval").length,
        InProgress: its.filter((t) => t.status === "in_progress").length,
        Rejected: its.filter((t) => t.status === "rejected").length,
        Locked: its.filter((t) => t.status === "locked").length,
      };
    });
    exportToExcel(rows, `prima-interns-${new Date().toISOString().slice(0, 10)}`);
    toast.success("Exported to Excel");
  };

  const domains = Array.from(new Set(interns.map((i) => i.internship_domain).filter(Boolean)));
  const filtered = interns.filter((i) => {
    if (domainFilter !== "all" && i.internship_domain !== domainFilter) return false;
    if (statusFilter === "complete") return i.onboarding_step >= 4;
    if (statusFilter === "onboarding") return i.onboarding_step < 4;
    return true;
  });

  const selectedIntern = selected ? interns.find((i) => i.id === selected) : null;
  const selectedTasks = selected ? internTasks(selected) : [];

  const statusIcon = (s: Task["status"]) => {
    if (s === "approved") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (s === "pending_approval") return <Clock className="h-4 w-4 text-warning" />;
    if (s === "rejected") return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (s === "locked") return <Lock className="h-4 w-4 text-muted-foreground" />;
    return <Clock className="h-4 w-4 text-info" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Admin Panel</div>
              <div className="text-xs text-muted-foreground">{adminConfig.ADMIN_NAME}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportAll}>
              <Download className="mr-2 h-4 w-4" />Export Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => nav({ to: "/" }))}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Total Interns" value={interns.length} icon={Users} />
          <StatCard label="Onboarded" value={interns.filter((i) => i.onboarding_step >= 4).length} icon={CheckCircle2} />
          <StatCard label="Pending Reviews" value={tasks.filter((t) => t.status === "pending_approval").length} icon={Clock} />
          <StatCard label="Total Tasks" value={tasks.length} icon={CheckCircle2} />
        </div>

        <AdminSignupCodeCard />



        <div className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <h2 className="text-lg font-semibold">Interns</h2>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="complete">Onboarding Complete</SelectItem>
                  <SelectItem value="onboarding">In Onboarding</SelectItem>
                </SelectContent>
              </Select>
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Domain" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All domains</SelectItem>
                  {domains.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Onboarding</th>
                  <th className="px-4 py-3">Tasks</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const its = internTasks(i.id);
                  const apr = its.filter((t) => t.status === "approved").length;
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{i.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.email}</td>
                      <td className="px-4 py-3">{i.internship_domain || "—"}</td>
                      <td className="px-4 py-3">
                        {i.onboarding_step >= 4
                          ? <span className="text-success">Complete</span>
                          : <span className="text-warning">Step {i.onboarding_step}/3</span>}
                      </td>
                      <td className="px-4 py-3">{apr}/{its.length}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(i.id)}>Manage</Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No interns found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedIntern?.name} — Task Management</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {selectedIntern?.email}</div>
              <div><span className="text-muted-foreground">Mobile:</span> {selectedIntern?.mobile}</div>
              <div><span className="text-muted-foreground">Domain:</span> {selectedIntern?.internship_domain}</div>
            </div>

            <div className="rounded-lg border p-3">
              <h3 className="mb-2 text-sm font-semibold">Add new task</h3>
              <div className="space-y-2">
                <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                <Textarea placeholder="Task description" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={2} />
                <Button size="sm" onClick={() => selected && addTask(selected)}>
                  <Plus className="mr-1 h-4 w-4" />Add task
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {selectedTasks.map((t) => (
                <div key={t.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon(t.status)}
                      <span className="font-medium">Task {t.sequence_order}: {t.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{t.status.replace("_", " ")}</span>
                  </div>
                  {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                  {t.submission && (
                    <div className="mt-2 rounded bg-muted/40 p-2 text-sm">
                      <div className="text-xs font-semibold text-muted-foreground">Submission:</div>
                      <div className="whitespace-pre-wrap">{t.submission}</div>
                    </div>
                  )}
                  {t.status === "pending_approval" && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs">Feedback / remarks</Label>
                      <Textarea
                        placeholder="Add feedback for the intern..."
                        value={feedback[t.id] ?? ""}
                        onChange={(e) => setFeedback({ ...feedback, [t.id]: e.target.value })}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approve(t)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => reject(t)}>Reject</Button>
                      </div>
                    </div>
                  )}
                  {t.feedback && t.status !== "pending_approval" && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold">Feedback:</span> {t.feedback}
                    </div>
                  )}
                </div>
              ))}
              {selectedTasks.length === 0 && (
                <div className="text-center text-sm text-muted-foreground">No tasks yet — add one above.</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function AdminSignupCodeCard() {
  const getCode = useServerFn(getAdminSignupCode);
  const updateCode = useServerFn(updateAdminSignupCode);
  const [current, setCurrent] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await getCode();
      setCurrent(r.code);
      setValue(r.code);
      setUpdatedAt(r.updated_at);
    } catch (e) {
      // silently ignore for non-admins
    }
  }, [getCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed.length < 6) return toast.error("Code must be at least 6 characters");
    if (trimmed === current) return toast.info("Code unchanged");
    setSaving(true);
    try {
      await updateCode({ data: { code: trimmed } });
      toast.success("Admin signup code updated");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update code");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Admin signup code</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Anyone registering at <span className="font-mono">/admin-signup</span> must enter this code.
        Change it any time to invalidate old codes.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Set a new secret code"
            className="pr-10 font-mono"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide" : "Show"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Update code"}
        </Button>
      </div>
      {updatedAt && (
        <div className="mt-2 text-xs text-muted-foreground">
          Last updated {new Date(updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

