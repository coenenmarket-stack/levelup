import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, ChevronLeft, CheckCircle2, ShieldAlert } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.12a6.6 6.6 0 0 1 0-4.24V7.04H2.18a11 11 0 0 0 0 9.92l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.2 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.365 1.43c0 1.14-.42 2.21-1.26 2.99-.85.84-1.95 1.32-3.04 1.24-.13-1.1.4-2.23 1.21-2.99.81-.79 2.16-1.39 3.09-1.24zM20.5 17.43c-.51 1.18-.75 1.71-1.41 2.75-.93 1.46-2.24 3.28-3.87 3.29-1.45.02-1.82-.94-3.78-.93-1.97.01-2.37.95-3.82.94-1.62-.02-2.87-1.66-3.8-3.12C1.05 16.49.78 11.45 2.85 8.71c1.49-1.97 3.85-3.13 6.05-3.13 2.24 0 3.65 1.22 5.5 1.22 1.79 0 2.88-1.22 5.47-1.22 1.95 0 4.02 1.06 5.5 2.89-4.83 2.64-4.05 9.55.13 8.96z" />
    </svg>
  );
}

function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <Logo className="w-12 h-12" />
            <div>
              <div className="text-xl font-extrabold tracking-tight">Level Up Life</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Real life RPG</div>
            </div>
          </div>
          {children}
        </div>
      </div>
      {footer && <div className="px-6 pb-8 text-center text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}

type Mode = "login" | "signup" | "forgot" | "reset" | "verify";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, signup, googleSignIn, forgotPassword, resetPassword, verifyEmail } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Couldn't sign in", description: parseError(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signup(email, password);
      setVerifyToken("");
      setMode("verify");
    } catch (err: any) {
      toast({ title: "Couldn't create account", description: parseError(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await googleSignIn();
      navigate("/");
    } catch (err: any) {
      toast({ title: "Google sign-in failed", description: parseError(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setResetToken("");
      setResetSent(true);
    } catch (err: any) {
      toast({ title: "Couldn't send reset", description: parseError(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(resetToken, password);
      toast({ title: "Password updated", description: "Sign in with your new password." });
      setPassword("");
      setMode("login");
      setResetSent(false);
      setResetToken("");
    } catch (err: any) {
      toast({ title: "Couldn't reset password", description: parseError(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      await verifyEmail(verifyToken);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Couldn't verify", description: parseError(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- LOGIN ----
  if (mode === "login") {
    return (
      <AuthShell
        footer={
          <span>
            By continuing, you agree to the{" "}
            <a className="underline underline-offset-2" href="/terms.html" target="_blank" rel="noreferrer">
              Terms
            </a>{" "}
            &{" "}
            <a className="underline underline-offset-2" href="/privacy.html" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </span>
        }
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue your adventure.</p>
        </div>

        <div className="grid gap-2.5">
          <button onClick={handleGoogle} disabled={submitting} data-testid="button-google"
            className="surface rounded-xl py-3 px-4 flex items-center justify-center gap-2.5 hover-elevate active-elevate font-medium disabled:opacity-50">
            <GoogleIcon className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
          <button disabled className="surface rounded-xl py-3 px-4 flex items-center justify-center gap-2.5 font-medium opacity-50 cursor-not-allowed" data-testid="button-apple">
            <AppleIcon className="w-5 h-5" />
            <span>Continue with Apple</span>
            <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">Soon</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-card-border" />
          <span>or sign in with email</span>
          <div className="flex-1 h-px bg-card-border" />
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <FieldEmail value={email} onChange={setEmail} />
          <FieldPassword value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw(s => !s)} />
          <div className="flex justify-end">
            <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline" data-testid="link-forgot">
              Forgot password?
            </button>
          </div>
          <PrimaryButton submitting={submitting} testId="button-login">Sign in</PrimaryButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline" data-testid="link-signup">
            Create account
          </button>
        </p>
      </AuthShell>
    );
  }

  // ---- SIGNUP ----
  if (mode === "signup") {
    return (
      <AuthShell
        footer={
          <span>
            By creating an account, you agree to the{" "}
            <a className="underline underline-offset-2" href="/terms.html" target="_blank" rel="noreferrer">
              Terms
            </a>{" "}
            &{" "}
            <a className="underline underline-offset-2" href="/privacy.html" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </span>
        }
      >
        <button onClick={() => setMode("login")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="link-back-login">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start turning your life into an adventure.</p>
        </div>

        <div className="grid gap-2.5">
          <button onClick={handleGoogle} disabled={submitting} data-testid="button-google-signup"
            className="surface rounded-xl py-3 px-4 flex items-center justify-center gap-2.5 hover-elevate active-elevate font-medium disabled:opacity-50">
            <GoogleIcon className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
          <button disabled className="surface rounded-xl py-3 px-4 flex items-center justify-center gap-2.5 font-medium opacity-50 cursor-not-allowed">
            <AppleIcon className="w-5 h-5" />
            <span>Continue with Apple</span>
            <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">Soon</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-card-border" />
          <span>or sign up with email</span>
          <div className="flex-1 h-px bg-card-border" />
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <FieldEmail value={email} onChange={setEmail} />
          <FieldPassword value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw(s => !s)} hint="At least 8 characters" />
          <PrimaryButton submitting={submitting} testId="button-signup">Create account</PrimaryButton>
        </form>
      </AuthShell>
    );
  }

  // ---- FORGOT ----
  if (mode === "forgot") {
    return (
      <AuthShell>
        <button onClick={() => { setMode("login"); setResetSent(false); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="link-back-forgot">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to sign in
        </button>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Forgot password</h1>
          <p className="text-sm text-muted-foreground">We'll send you a link to reset it.</p>
        </div>

        {!resetSent ? (
          <form onSubmit={handleForgot} className="space-y-3">
            <FieldEmail value={email} onChange={setEmail} />
            <PrimaryButton submitting={submitting} testId="button-send-reset">Send reset link</PrimaryButton>
          </form>
        ) : (
          <div className="surface rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Check your email</span>
            </div>
            <p className="text-muted-foreground text-xs">
              If an account exists for <span className="text-foreground">{email}</span>, a reset link was sent.
            </p>
            {resetToken && (
              <div className="rounded-lg bg-secondary/40 p-2.5 border border-card-border space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3" /> Sandbox dev hint
                </div>
                <p className="text-[11px] text-muted-foreground">No real email was sent. Use this token to reset now:</p>
                <code className="block text-[10px] break-all text-foreground/90 font-mono">{resetToken}</code>
                <button onClick={() => setMode("reset")} className="w-full rounded-md py-1.5 bg-primary text-primary-foreground text-xs font-semibold" data-testid="button-use-token">
                  Use this token to reset →
                </button>
              </div>
            )}
          </div>
        )}
      </AuthShell>
    );
  }

  // ---- RESET ----
  if (mode === "reset") {
    return (
      <AuthShell>
        <button onClick={() => setMode("login")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Cancel
        </button>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted-foreground">At least 8 characters.</p>
        </div>
        <form onSubmit={handleReset} className="space-y-3">
          <div>
            <Label htmlFor="reset-token" className="text-xs">Reset token</Label>
            <Input id="reset-token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="mt-1 font-mono text-xs" data-testid="input-reset-token" />
          </div>
          <FieldPassword value={password} onChange={setPassword} show={showPw} toggle={() => setShowPw(s => !s)} hint="At least 8 characters" />
          <PrimaryButton submitting={submitting} testId="button-confirm-reset">Update password</PrimaryButton>
        </form>
      </AuthShell>
    );
  }

  // ---- VERIFY ----
  return (
    <AuthShell>
      <div className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Verify your email</h1>
          <p className="text-sm text-muted-foreground mt-1">We sent a verification link to <span className="text-foreground">{email}</span>.</p>
        </div>
      </div>
      {verifyToken && (
        <div className="surface rounded-xl p-4 space-y-2.5 text-sm">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3" /> Sandbox dev hint
          </div>
          <p className="text-[11px] text-muted-foreground">No real email was sent in this preview. Tap below to verify and continue.</p>
        </div>
      )}
      <PrimaryButton submitting={submitting} testId="button-verify-continue" onClick={handleVerify}>
        I've verified — Begin Journey
      </PrimaryButton>
      <p className="text-center text-xs text-muted-foreground">
        Wrong email?{" "}
        <button onClick={() => setMode("signup")} className="text-primary hover:underline">Start over</button>
      </p>
    </AuthShell>
  );
}

function FieldEmail({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor="auth-email" className="text-xs">Email</Label>
      <div className="relative mt-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input id="auth-email" type="email" required autoComplete="email" value={value} onChange={(e) => onChange(e.target.value)} className="pl-9" placeholder="you@email.com" data-testid="input-email" />
      </div>
    </div>
  );
}

function FieldPassword({ value, onChange, show, toggle, hint }: { value: string; onChange: (v: string) => void; show: boolean; toggle: () => void; hint?: string }) {
  return (
    <div>
      <Label htmlFor="auth-password" className="text-xs">Password</Label>
      <div className="relative mt-1">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input id="auth-password" type={show ? "text" : "password"} required autoComplete="current-password" value={value} onChange={(e) => onChange(e.target.value)} className="pl-9 pr-10" placeholder="••••••••" data-testid="input-password" />
        <button type="button" onClick={toggle} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PrimaryButton({ children, submitting, testId, onClick }: { children: React.ReactNode; submitting: boolean; testId?: string; onClick?: () => void }) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={submitting}
      data-testid={testId}
      className="w-full rounded-xl py-3 bg-primary text-primary-foreground font-semibold hover-elevate active-elevate flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function parseError(err: any): string {
  const msg = err?.message ?? "Something went wrong";
  // err.message is typically "400: {json}"
  const m = String(msg).match(/^\d+:\s*(\{.*\})$/);
  if (m) {
    try { return JSON.parse(m[1]).error ?? msg; } catch { /* ignore */ }
  }
  return msg;
}
