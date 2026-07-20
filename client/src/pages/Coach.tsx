import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, RefreshCw } from "lucide-react";
import { useGame } from "@/lib/game";
import { apiRequest } from "@/lib/queryClient";

type Msg = { role: "coach" | "you"; text: string; fallback?: boolean };

const STARTER_PROMPTS = [
  "What should I focus on today?",
  "Give me a quest for my Etsy shop",
  "I'm feeling stuck — pull me out of it",
  "How do I keep my streak alive when I'm tired?",
];

export default function Coach() {
  const { character } = useGame();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Seed with a welcome message once we know the character name
  useEffect(() => {
    if (character && messages.length === 0) {
      setMessages([
        {
          role: "coach",
          text: `Hey ${character.name}. I'm your AI coach — I know your level, streak, goals, skill trees, and today's quests. Ask me what to focus on, or how to level up your weakest category.`,
        },
      ]);
    }
  }, [character, messages.length]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/coach", { message });
      return res.json() as Promise<{ reply: string; fallback?: boolean }>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "coach", text: data.reply, fallback: data.fallback }]);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center gold-glow">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" data-testid="text-coach-title">
              AI Coach
            </h1>
            <p className="text-xs text-muted-foreground">Personalized to your hero</p>
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

      {/* Conversation */}
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

      {/* Starter prompts (only show before first user message) */}
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

      {/* Composer */}
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
