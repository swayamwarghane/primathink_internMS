import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MailCheck, RefreshCw } from "lucide-react";

const search = z.object({
  email: z.string().email().optional().catch(undefined),
  next: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmail,
  validateSearch: (s) => search.parse(s),
});

function VerifyEmail() {
  const { email: initialEmail, next } = useSearch({ from: "/verify-email" });
  const [email, setEmail] = useState(initialEmail ?? "");
  const [resending, setResending] = useState(false);

  const resend = async () => {
    if (!email) return toast.error("Enter your email first");
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email re-sent. Check your inbox.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Verify your email</div>
            <div className="text-xs text-muted-foreground">Prima Interns</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a verification link to your email. Click the link in that email to activate your account.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={resend}
            disabled={resending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${resending ? "animate-spin" : ""}`} />
            {resending ? "Sending..." : "Resend verification email"}
          </Button>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link to={next ?? "/login"} className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
