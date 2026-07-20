import { Heart, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

const CASHTAG = "Zcoenen";
const CASHAPP_URL = `https://cash.app/$${CASHTAG}`;

export default function SupportPage() {
  const [copied, setCopied] = useState(false);

  const copyTag = async () => {
    try {
      await navigator.clipboard.writeText(`$${CASHTAG}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent fail — clipboard may be blocked
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">
          Support Level Up Life
        </h1>
        <p className="text-sm text-muted-foreground">
          Built by one person on coffee and late nights. If this app helped you level up your life, a tip keeps it free for everyone.
        </p>
      </div>

      <section className="surface rounded-2xl p-5 text-center space-y-4" data-testid="section-cashapp">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/15 text-accent">
          <Heart className="w-6 h-6" fill="currentColor" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cash App</div>
          <div className="mt-1 font-num font-extrabold text-3xl gold-text">${CASHTAG}</div>
        </div>

        {/* QR code */}
        <div className="mx-auto w-56 h-56 rounded-2xl bg-white p-3 shadow-lg" data-testid="qr-cashapp">
          <img
            src="/cashapp_qr.png"
            alt={`Scan to send to $${CASHTAG} on Cash App`}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <a
            href={CASHAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-open-cashapp"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover-elevate"
          >
            <ExternalLink className="w-4 h-4" />
            Open Cash App
          </a>
          <button
            type="button"
            onClick={copyTag}
            data-testid="button-copy-cashtag"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm hover-elevate"
          >
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy $tag"}
          </button>
        </div>
      </section>

      <section className="surface rounded-2xl p-5 space-y-3" data-testid="section-why-support">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Why support?</div>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2.5">
            <span className="text-accent mt-0.5">»</span>
            <span>Keeps the app free with no ads, no paywalls, no upsells.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-accent mt-0.5">»</span>
            <span>Funds new content — quests, hubs, side hustle tracks, AI features.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-accent mt-0.5">»</span>
            <span>One developer building this in public. Every tip means another late-night build session.</span>
          </li>
        </ul>
      </section>

      <p className="text-[11px] text-center text-muted-foreground px-4">
        Tips are gifts, not purchases. No refunds, no rewards owed. Thank you for being part of the journey.
      </p>
    </div>
  );
}
