import { Link } from "wouter";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="space-y-5 py-10" data-testid="page-not-found">
      <div className="surface rounded-2xl p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-destructive/15 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That screen isn&apos;t available. Head home to keep leveling up.
        </p>
        <Link
          href="/"
          data-testid="button-not-found-home"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover-elevate"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
