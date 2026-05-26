import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { claimAdminWithCode } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin-signup")({ component: AdminSignup });

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  designation: z.string().trim().min(2).max(100),
  password: z.string().min(6).max(72),
  code: z.string().min(1).max(200),
});

function AdminSignup() {
  const nav = useNavigate();
  const claim = useServerFn(claimAdminWithCode);
  const [form, setForm] = useState({
    name: "", email: "", designation: "", password: "", code: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    try {
      // 1) Create the auth account (email verification required)
      const { error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin-login`,
          data: { name: form.name, mobile: form.designation },
        },
      });
      if (signUpErr) {
        toast.error(signUpErr.message);
        return;
      }
      // Persist the admin code so it can be claimed after email verification + sign-in
      try {
        localStorage.setItem("pendingAdminCode", form.code);
      } catch { /* ignore */ }
      toast.success("We've emailed you a 6-digit verification code.");
      nav({ to: "/verify-email", search: { email: form.email, next: "/admin-login" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
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
            <div className="font-semibold text-white">Admin Signup</div>
            <div className="text-xs text-slate-400">Prima Interns</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Create administrator account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Requires a valid admin signup code from the system owner.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-200">Admin Name</Label>
            <Input id="name" required value={form.name} onChange={set("name")}
              className="bg-slate-800 text-white border-slate-700" />
          </div>
          <div>
            <Label htmlFor="email" className="text-slate-200">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={set("email")}
              className="bg-slate-800 text-white border-slate-700" />
          </div>
          <div>
            <Label htmlFor="designation" className="text-slate-200">Role / Designation</Label>
            <Input id="designation" required value={form.designation} onChange={set("designation")}
              placeholder="e.g. Program Director"
              className="bg-slate-800 text-white border-slate-700" />
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-200">Password</Label>
            <Input id="password" type="password" required value={form.password} onChange={set("password")}
              className="bg-slate-800 text-white border-slate-700" />
          </div>
          <div>
            <Label htmlFor="code" className="text-slate-200">Admin Signup Code</Label>
            <Input id="code" required value={form.code} onChange={set("code")}
              className="bg-slate-800 text-white border-slate-700" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Admin Account"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
          <Link to="/admin-login" className="hover:text-white">← Admin Login</Link>
          <Link to="/" className="hover:text-white">Home →</Link>
        </div>
      </div>
    </div>
  );
}
