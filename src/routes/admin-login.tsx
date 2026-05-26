import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ensureAdminRole, claimAdminWithCode } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { adminConfig } from "@/config/adminConfig";

export const Route = createFileRoute("/admin-login")({ component: AdminLogin });

function AdminLogin() {
  const nav = useNavigate();
  const ensureAdmin = useServerFn(ensureAdminRole);
  const claim = useServerFn(claimAdminWithCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = /confirm/i.test(error.message)
          ? "Please verify your email first. Check your inbox for the confirmation link."
          : error.message;
        toast.error(msg);
        return;
      }
      // Elevate to admin if this is the primary admin email (no-op otherwise)
      try { await ensureAdmin(); } catch { /* not the primary admin */ }

      // If a signup code is pending from admin-signup, claim admin now
      let pendingCode: string | null = null;
      try { pendingCode = localStorage.getItem("pendingAdminCode"); } catch { /* ignore */ }
      if (pendingCode) {
        try {
          await claim({ data: { code: pendingCode } });
          localStorage.removeItem("pendingAdminCode");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Invalid admin signup code");
        }
      }

      // Check whether the signed-in user actually has the admin role
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        await supabase.auth.signOut();
        toast.error("Sign-in failed.");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      const isAdmin = !!roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("This account does not have admin access.");
        return;
      }
      toast.success("Welcome, admin");
      nav({ to: "/admin" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-white">Admin Portal</div>
            <div className="text-xs text-slate-400">Prima Interns</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Administrator sign in</h1>
        <p className="mt-1 text-sm text-slate-400">
          Restricted access. Manage interns, assign tasks, and review submissions.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email" className="text-slate-200">Admin Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={adminConfig.ADMIN_EMAIL}
              className="bg-slate-800 text-white border-slate-700"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-200">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-800 text-white border-slate-700"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to Admin Portal"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
          <Link to="/" className="hover:text-white">← Back to home</Link>
          <Link to="/admin-signup" className="hover:text-white">Create admin account →</Link>
        </div>
        <div className="mt-2 text-center text-xs text-slate-500">
          <Link to="/login" className="hover:text-white">Intern login</Link>
        </div>
      </div>
    </div>
  );
}
