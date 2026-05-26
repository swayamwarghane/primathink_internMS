import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Lock, Clock, CheckCircle2, AlertCircle, Award, LogOut, GraduationCap } from "lucide-react";
import { generateCertificate } from "@/lib/certificate";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

interface Task {
  id: string;
  title: string;
  description: string | null;
  sequence_order: number;
  status: "locked" | "in_progress" | "pending_approval" | "approved" | "rejected";
  submission: string | null;
  feedback: string | null;
}

function Dashboard() {
  const { user, loading, onboardingStep, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [submissions, setSubmissions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: ts }, { data: p }] = await Promise.all([
      supabase.from("tasks").select("*").eq("intern_id", user.id).order("sequence_order"),
      supabase.from("profiles").select("internship_domain, name").eq("id", user.id).maybeSingle(),
    ]);
    setTasks((ts ?? []) as Task[]);
    setDomain(p?.internship_domain ?? "");
    setName(p?.name ?? "");
    const subs: Record<string, string> = {};
    (ts ?? []).forEach((t) => { subs[t.id] = t.submission ?? ""; });
    setSubmissions(subs);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (isAdmin) { nav({ to: "/admin" }); return; }
    if (onboardingStep < 4) { nav({ to: "/onboarding" }); return; }
    load();
  }, [user, loading, onboardingStep, isAdmin, nav, load]);

  const submit = async (task: Task) => {
    if (!submissions[task.id]?.trim()) return toast.error("Add your submission notes first");
    setBusy(task.id);
    const { error } = await supabase.from("tasks").update({
      status: "pending_approval",
      submission: submissions[task.id],
      submitted_at: new Date().toISOString(),
      feedback: "",
    }).eq("id", task.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Submitted for approval");
    load();
  };

  const approvedCount = tasks.filter((t) => t.status === "approved").length;
  const allApproved = tasks.length > 0 && approvedCount === tasks.length;
  const progressPct = tasks.length ? (approvedCount / tasks.length) * 100 : 0;

  const downloadCert = () => {
    generateCertificate({
      name,
      domain: domain || "Internship Program",
      completionDate: new Date(),
      certificateId: `PI-${user?.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    });
  };

  const statusBadge = (s: Task["status"]) => {
    const map: Record<Task["status"], { label: string; cls: string; icon: typeof Lock }> = {
      locked: { label: "Locked", cls: "bg-muted text-muted-foreground", icon: Lock },
      in_progress: { label: "In Progress", cls: "bg-info text-info-foreground", icon: Clock },
      pending_approval: { label: "Pending Approval", cls: "bg-warning text-warning-foreground", icon: Clock },
      approved: { label: "Approved", cls: "bg-success text-success-foreground", icon: CheckCircle2 },
      rejected: { label: "Rework Required", cls: "bg-destructive text-destructive-foreground", icon: AlertCircle },
    };
    const { label, cls, icon: Icon } = map[s];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">{name || "Intern"}</div>
              <div className="text-xs text-muted-foreground">{domain}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => nav({ to: "/" }))}>
            <LogOut className="mr-2 h-4 w-4" />Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your tasks</h1>
              <p className="text-sm text-muted-foreground">
                Tasks unlock one at a time as the admin approves them.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="text-2xl font-bold">{approvedCount}/{tasks.length || 0}</div>
            </div>
          </div>
          <Progress value={progressPct} className="mt-4" />

          <div className={`mt-6 flex flex-col items-start gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between ${allApproved ? "border-success/30 bg-success/10" : "border-border bg-muted/30"}`}>
            <div className="flex items-center gap-3">
              <Award className={`h-6 w-6 ${allApproved ? "text-success" : "text-muted-foreground"}`} />
              <div>
                <div className="font-semibold">
                  {allApproved ? "Congratulations! All tasks approved." : "Completion Certificate"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {allApproved
                    ? "Your certificate is ready to download."
                    : `Complete all ${tasks.length || ""} tasks to unlock your certificate (${approvedCount}/${tasks.length || 0} approved).`}
                </div>
              </div>
            </div>
            <Button onClick={downloadCert} disabled={!allApproved}>
              Download Certificate
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {tasks.length === 0 && (
            <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
              No tasks assigned yet. Check back later.
            </div>
          )}
          {tasks.map((task) => {
            const isLocked = task.status === "locked";
            const isActive = task.status === "in_progress" || task.status === "rejected";
            const isPending = task.status === "pending_approval";
            return (
              <div key={task.id} className={`rounded-xl border bg-card p-6 ${isLocked ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Task {task.sequence_order}</span>
                      {statusBadge(task.status)}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{task.title}</h3>
                    {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
                  </div>
                </div>

                {task.status === "rejected" && task.feedback && (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                    <div className="font-semibold text-destructive">Rework Required — Admin feedback:</div>
                    <div className="mt-1">{task.feedback}</div>
                  </div>
                )}

                {!isLocked && task.status !== "approved" && (
                  <div className="mt-4">
                    <Textarea
                      placeholder="Describe your work, paste links, etc."
                      value={submissions[task.id] ?? ""}
                      onChange={(e) => setSubmissions({ ...submissions, [task.id]: e.target.value })}
                      disabled={isPending}
                      rows={4}
                    />
                    <div className="mt-3 flex justify-end">
                      <Button onClick={() => submit(task)} disabled={isPending || busy === task.id || !isActive}>
                        {isPending ? "Awaiting Admin..." : busy === task.id ? "Submitting..." : "Submit for Approval"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
