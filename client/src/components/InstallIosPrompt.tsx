import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { isIOSSafari, isStandalonePwa, isNativeApp } from "@/lib/ios";

const DISMISS_KEY = "lul-ios-install-dismissed";

export function InstallIosPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isIOSSafari()) return;
    if (isStandalonePwa() || isNativeApp()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const t = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] inset-x-4 z-[55] mx-auto max-w-md"
      data-testid="ios-install-prompt"
    >
      <div className="surface-raised rounded-2xl border border-primary/30 p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Share className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Install on your iPhone</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tap <span className="text-foreground font-medium">Share</span>, then{" "}
              <span className="text-foreground font-medium">Add to Home Screen</span> for the full app experience.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setVisible(false);
            }}
            className="text-muted-foreground hover-elevate rounded p-1"
            aria-label="Dismiss install hint"
            data-testid="button-dismiss-ios-install"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
