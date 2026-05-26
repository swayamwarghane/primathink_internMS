import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, loading, onboardingStep, refresh, isAdmin } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const [personal, setPersonal] = useState({
    date_of_birth: "",
    address: "",
    skills: "",
    internship_domain: "",
  });
  const [college, setCollege] = useState({
    college_name: "",
    degree: "",
    branch: "",
    year_of_passing: "",
  });

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (isAdmin) { nav({ to: "/admin" }); return; }
    if (onboardingStep >= 4) { nav({ to: "/dashboard" }); return; }
    setStep(Math.max(2, onboardingStep + 1));
  }, [user, loading, onboardingStep, isAdmin, nav]);

  const submitPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!personal.date_of_birth || !personal.address || !personal.skills || !personal.internship_domain)
      return toast.error("All fields required");
    setSubmitting(true);
    const { error: e1 } = await supabase.from("personal_details").upsert({
      user_id: user.id,
      ...personal,
    });
    if (e1) { setSubmitting(false); return toast.error(e1.message); }
    const { error: e2 } = await supabase.from("profiles").update({
      internship_domain: personal.internship_domain,
      onboarding_step: 2,
    }).eq("id", user.id);
    setSubmitting(false);
    if (e2) return toast.error(e2.message);
    await refresh();
    setStep(3);
    toast.success("Personal details saved");
  };

  const submitCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!college.college_name || !college.degree || !college.branch || !college.year_of_passing)
      return toast.error("All fields required");
    setSubmitting(true);
    const { error: e1 } = await supabase.from("college_details").upsert({
      user_id: user.id,
      college_name: college.college_name,
      degree: college.degree,
      branch: college.branch,
      year_of_passing: parseInt(college.year_of_passing, 10),
    });
    if (e1) { setSubmitting(false); return toast.error(e1.message); }
    const { error: e2 } = await supabase.from("profiles").update({ onboarding_step: 4 }).eq("id", user.id);
    setSubmitting(false);
    if (e2) return toast.error(e2.message);
    await refresh();
    toast.success("Onboarding complete!");
    nav({ to: "/dashboard" });
  };

  const progress = ((step - 1) / 3) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Complete your onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">All three steps are required before you can access your dashboard.</p>

        <div className="mt-6 rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="font-medium">Step {step} of 3</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="mb-6" />

          <div className="mb-6 flex items-center gap-2 text-sm">
            {[
              { n: 1, t: "Account" },
              { n: 2, t: "Personal" },
              { n: 3, t: "College" },
            ].map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center gap-2">
                <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                  step > s.n ? "bg-success text-success-foreground"
                  : step === s.n ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.n ? <Check className="h-4 w-4" /> : s.n}
                </div>
                <span className={step >= s.n ? "font-medium" : "text-muted-foreground"}>{s.t}</span>
                {i < 2 && <div className="mx-2 h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>

          {step === 2 && (
            <form onSubmit={submitPersonal} className="space-y-4">
              <h2 className="text-lg font-semibold">Personal Details</h2>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" required value={personal.date_of_birth} onChange={(e) => setPersonal({ ...personal, date_of_birth: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" required value={personal.address} onChange={(e) => setPersonal({ ...personal, address: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input id="skills" required placeholder="React, Node.js, SQL" value={personal.skills} onChange={(e) => setPersonal({ ...personal, skills: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="domain">Internship Domain</Label>
                <Input id="domain" required placeholder="Frontend Development" value={personal.internship_domain} onChange={(e) => setPersonal({ ...personal, internship_domain: e.target.value })} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving..." : "Continue"}
              </Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={submitCollege} className="space-y-4">
              <h2 className="text-lg font-semibold">College Details</h2>
              <div>
                <Label htmlFor="college">College Name</Label>
                <Input id="college" required value={college.college_name} onChange={(e) => setCollege({ ...college, college_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="degree">Degree</Label>
                <Input id="degree" required placeholder="B.Tech" value={college.degree} onChange={(e) => setCollege({ ...college, degree: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input id="branch" required placeholder="Computer Science" value={college.branch} onChange={(e) => setCollege({ ...college, branch: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="year">Year of Passing</Label>
                <Input id="year" type="number" required min="2000" max="2099" value={college.year_of_passing} onChange={(e) => setCollege({ ...college, year_of_passing: e.target.value })} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving..." : "Finish onboarding"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
