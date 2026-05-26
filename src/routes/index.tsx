import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, ListChecks, ShieldCheck, Award } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user, isAdmin, onboardingStep, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    if (isAdmin) nav({ to: "/admin" });
    else if (onboardingStep < 4) nav({ to: "/onboarding" });
    else nav({ to: "/dashboard" });
  }, [user, isAdmin, onboardingStep, loading, nav]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Prima Interns</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/login">Sign In</Link></Button>
            <Button asChild><Link to="/register">Get Started</Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <section className="text-center">
          <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
            Internship management,<br />done right.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Multi-step onboarding, sequential task progression, admin approvals, and
            automated certificates — all in one clean dashboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link to="/register">Register as Intern</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">Intern Login</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link to="/admin-login">Admin Login</Link></Button>
            
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-4">
          {[
            { i: GraduationCap, t: "Guided onboarding", d: "3-step wizard collects account, personal & college details." },
            { i: ListChecks, t: "Sequential tasks", d: "Tasks unlock one-by-one as the admin approves them." },
            { i: ShieldCheck, t: "Admin approvals", d: "Review submissions, leave feedback, approve or reject." },
            { i: Award, t: "Auto certificate", d: "Download a professional PDF once all tasks are approved." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-xl border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
