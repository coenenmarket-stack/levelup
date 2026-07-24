import { BookOpen, Brain, Wind, Target, Quote, RefreshCw, Headphones, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { QUOTES, quoteForToday } from "@/lib/quotes";
import { MINDSET_PRACTICES } from "@/lib/mindsetPractices";

type Podcast = {
  id: string;
  name: string;
  host: string;
  pitch: string;
  url: string;
};

const PODCASTS: Podcast[] = [
  {
    id: "mindset-mentor",
    name: "The Mindset Mentor",
    host: "Rob Dial",
    pitch: "Short, daily-fire episodes on discipline, focus, and the psychology of winning.",
    url: "https://open.spotify.com/show/706hylM6zaDW8LrrYxcggQ",
  },
  {
    id: "huberman-lab",
    name: "Huberman Lab",
    host: "Dr. Andrew Huberman",
    pitch: "Stanford neuroscientist breaks down the science of focus, sleep, and motivation.",
    url: "https://open.spotify.com/show/5eodRZd3qR9VT1ip1wI7xQ",
  },
  {
    id: "jocko-podcast",
    name: "Jocko Podcast",
    host: "Jocko Willink",
    pitch: "Discipline equals freedom. Leadership and ownership from a retired Navy SEAL.",
    url: "https://open.spotify.com/search/Jocko%20Podcast/shows",
  },
  {
    id: "diary-of-a-ceo",
    name: "The Diary of a CEO",
    host: "Steven Bartlett",
    pitch: "Deep, raw conversations with founders, athletes, and thinkers about what really works.",
    url: "https://open.spotify.com/show/7iQXmUT7XGuZSzAMjoNWlX",
  },
  {
    id: "tim-ferriss-show",
    name: "The Tim Ferriss Show",
    host: "Tim Ferriss",
    pitch: "Tactics, routines, and habits from world-class performers across every field.",
    url: "https://open.spotify.com/search/The%20Tim%20Ferriss%20Show/shows",
  },
  {
    id: "ed-mylett-show",
    name: "The Ed Mylett Show",
    host: "Ed Mylett",
    pitch: "High-energy interviews on mindset, faith, and maximizing your one shot.",
    url: "https://open.spotify.com/show/19TdDBlFkqh7uevYO0jFSW",
  },
];

export default function MindsetPage() {
  // Start on today's rotating quote, but allow shuffling for browsing.
  const todayIdx = useMemo(() => QUOTES.indexOf(quoteForToday()), []);
  const [quoteIdx, setQuoteIdx] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [openId, setOpenId] = useState<string | null>(null);

  const todaysQuote = QUOTES[quoteIdx];

  const grouped = useMemo(() => {
    return {
      Easy: MINDSET_PRACTICES.filter((p) => p.difficulty === "Easy"),
      Medium: MINDSET_PRACTICES.filter((p) => p.difficulty === "Medium"),
      Hard: MINDSET_PRACTICES.filter((p) => p.difficulty === "Hard"),
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Mindset Hub</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Train the muscle between your ears. Pick one practice and run it today.
        </p>
      </div>

      {/* Quote of the day */}
      <section className="surface rounded-2xl p-5 relative overflow-hidden" data-testid="section-quote">
        <Quote className="absolute top-3 right-3 w-12 h-12 text-primary/10" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Today's mindset</div>
        <p className="mt-2 text-base font-semibold leading-snug">"{todaysQuote.text}"</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">— {todaysQuote.author}</div>
          <button
            type="button"
            onClick={() => setQuoteIdx((i) => (i + 1) % QUOTES.length)}
            data-testid="button-next-quote"
            className="flex items-center gap-1 text-[11px] uppercase tracking-[0.15em] text-primary hover-elevate rounded-md px-2 py-1"
          >
            <RefreshCw className="w-3 h-3" />
            Next
          </button>
        </div>
      </section>

      {/* Podcasts */}
      <section className="space-y-3" data-testid="section-podcasts">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-[#1DB954]" />
          <h2 className="text-sm font-bold tracking-tight uppercase tracking-[0.15em]">Podcasts to feed your head</h2>
        </div>
        <div className="space-y-2">
          {PODCASTS.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`podcast-${p.id}`}
              className="block surface rounded-2xl p-4 hover-elevate"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/40 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-tight">{p.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">with {p.host}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="text-xs text-foreground/80 mt-1.5 leading-snug">{p.pitch}</div>
                  <div className="mt-1.5 text-[10px] uppercase tracking-[0.15em] text-[#1DB954] font-semibold">Listen on Spotify ›</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Practices */}
      <section className="space-y-3" data-testid="section-practices">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold tracking-tight uppercase tracking-[0.15em]">Practices</h2>
        </div>

        {(["Easy", "Medium", "Hard"] as const).map((tier) => (
          <div key={tier} className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{tier}</div>
            <div className="space-y-2">
              {grouped[tier].map((p) => {
                const isOpen = openId === p.id;
                const Icon = p.id === "box-breathing" ? Wind : p.id === "fear-setting" ? Target : Brain;
                return (
                  <div key={p.id} className="surface rounded-2xl overflow-hidden" data-testid={`practice-${p.id}`}>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : p.id)}
                      className="w-full p-4 flex items-start gap-3 text-left hover-elevate"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-bold">{p.name}</div>
                          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{p.duration}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-card-border bg-card/30">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-3 mb-2">Steps</div>
                        <ol className="space-y-1.5">
                          {p.steps.map((s, i) => (
                            <li key={i} className="flex gap-2.5 text-sm">
                              <span className="font-num font-bold text-primary w-5 shrink-0">{i + 1}.</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
