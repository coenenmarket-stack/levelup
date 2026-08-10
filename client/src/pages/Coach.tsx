import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, RefreshCw } from "lucide-react";
import { useGame } from "@/lib/game";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { readPersonalization } from "@/lib/personalization/store";
import { DEFAULT_PERSONALIZATION, type PersonalizationPrefs } from "@/lib/personalization/types";
import { primaryGoalLabel } from "@/lib/personalization/engine";
import {
  formatCoachMemoryForPrompt,
  readCoachMemory,
  writeCoachMemory,
  type CoachMemory,
} from "@/lib/personalization/coachMemory";
import { buildCoachActionLinks, type CoachActionLink } from "@/lib/personalization/nextAction";
import { getCareerPath } from "@/lib/careerPaths";

type Msg = {
  role: "coach" | "you";
  text: string;
  fallback?: boolean;
  links?: CoachActionLink[];
};

const STARTER_PROMPTS = [
  "What should I focus on today?",
  "Help me stick to my career path",
  "I'm feeling stuck — pull me out of it",
  "How do I keep my streak alive when I'm tired?",
];

export default function Coach() {
  const { character } = useGame();
  const { me } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [prefs, setPrefs] = useState<PersonalizationPrefs>(DEFAULT_PERSONALIZATION);
  const [memory, setMemory] = useState<CoachMemory | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!me?.id) return;
    void (async () => {
      const [p, m] = await Promise.all([
        readPersonalization(String(me.id)),
        readCoachMemory(String(me.id)),
      ]);
      setPrefs(p);
      setMemory(m);
    })();
  }, [me?.id]);

  const welcome = useMemo(() => {
    if (!character) return "";
    const focus = primaryGoalLabel(prefs.primaryGoal);
    const path = prefs.activeCareerPathId ? getCareerPath(prefs.activeCareerPathId) : null;
    const pathBit = path ? ` You’re on the ${path.title} path.` : "";
    return `Hey ${character.name}. Your focus is ${focus}.${pathBit} I can see your streak, skills, and goals — ask what to do next. I recommend actions; I never award XP myself.`;
  }, [character, prefs]);

  useEffect(() => {
    if (character && messages.length === 0 && welcome) {
      setMessages([{ role: "coach", text: welcome }]);
    }
  }, [character, messages.length, welcome]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const actionLinks = useMemo(
    () =>
      buildCoachActionLinks({
        pathId: prefs.activeCareerPathId,
        questId: "daily",
      }),
    [prefs.activeCareerPathId],
  );

  const sendMut = useMutation({
    mutationFn: async (message: string) => {
      // Client-side context hint for CF (non-sensitive). CF also loads character.
      const contextNote = [
        prefs.primaryGoal ? `Primary goal: ${primaryGoalLabel(prefs.primaryGoal)}` : null,
        prefs.secondaryGoals.length
          ? `Secondary: ${prefs.secondaryGoals.map(primaryGoalLabel).join(", ")}`
          : null,
        prefs.activeCareerPathId ? `Active path: ${prefs.activeCareerPathId}` : null,
        memory ? `Memory:\n${formatCoachMemoryForPrompt(memory)}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await apiRequest("POST", "/api/coach", {
        message,
        personalizationHint: contextNote || undefined,
      });
      return res.json() as Promise<{ reply: string; fallback?: boolean }>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "coach", text: data.reply, fallback: data.fallback, links: actionLinks.slice(0, 2) },
      ]);
      if (me?.id && !data.fallback) {
        void writeCoachMemory(String(me.id), {
          lastRecommendation: data.reply.slice(0, 280),
          currentFocus: prefs.primaryGoal ? primaryGoalLabel(prefs.primaryGoal) : memory?.currentFocus ?? null,
        }).then(setMemory);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "coach",
          text: "Coach hit a snag. Try again in a moment, or do one tiny thing for your next quest right now.",
          fallback: true,
        },
      ]);
    },
  });

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sendMut.isPending) return;
    setMessages((prev) => [...prev, { role: "you", text: msg }]);
    setInput("");
    sendMut.mutate(msg);
  }

  function handleReset() {
    setMessages(
      character
        ? [{ role: "coach", text: `Fresh slate, ${character.name}. What do you want to work on?` }]
        : [],
    );
  }

  const hasConversation = messages.filter((m) => m.role === "you").length > 0;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 200px)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center gold-glow">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" data-testid="text-coach-title">
              AI Coach
            </h1>
            <p className="text-xs text-muted-foreground">Personalized to your plan — no XP from chat</p>
          </div>
        </div>
        {hasConversation && (
          <button
            onClick={handleReset}
            data-testid="button-coach-reset"
            className="text-xs text-muted-foreground hover-elevate rounded px-2 py-1 flex items-center gap-1.5"
            aria-label="Start a new conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        )}
      </div>

      {memory && (memory.coachingGoals.length > 0 || memory.activePlan) && (
        <div className="surface rounded-xl px-3 py-2 mb-3 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground text-sm mb-0.5">Coach memory</div>
          {memory.currentFocus && <div>Focus: {memory.currentFocus}</div>}
          {memory.activePlan && <div>Plan: {memory.activePlan}</div>}
          <Link href="/personalize" className="text-primary mt-1 inline-block">
            Edit preferences
          </Link>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto space-y-3 pb-4"
        data-testid="coach-conversation"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "you" ? "justify-end" : "justify-start"}`}
            data-testid={`msg-${m.role}-${i}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "you"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : `surface rounded-bl-md ${m.fallback ? "opacity-80" : ""}`
              }`}
            >
              {m.text}
              {m.links && m.links.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.links.map((l) => (
                    <Link
                      key={l.href + l.label}
                      href={l.href}
                      className="text-xs font-semibold text-primary underline"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sendMut.isPending && (
          <div className="flex justify-start" data-testid="msg-typing">
            <div className="surface rounded-2xl rounded-bl-md px-4 py-3 text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Coach is thinking…</span>
            </div>
          </div>
        )}
      </div>

      {!hasConversation && (
        <div className="mb-3 space-y-2" data-testid="starter-prompts">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1">
            Try asking
          </div>
          <div className="grid grid-cols-1 gap-2">
            {STARTER_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                disabled={sendMut.isPending}
                data-testid={`starter-${p.slice(0, 12).replace(/\s/g, "-")}`}
                className="surface rounded-xl px-3 py-2.5 text-sm text-left hover-elevate active-elevate-2 disabled:opacity-60"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] surface-raised rounded-2xl p-2 flex items-end gap-2 border border-card-border">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask your coach anything…"
          rows={1}
          data-testid="input-coach-message"
          className="flex-1 bg-transparent resize-none outline-none text-sm px-2 py-2 min-h-[2.25rem] max-h-32 leading-snug"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || sendMut.isPending}
          data-testid="button-coach-send"
          className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Send message"
        >
          {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
