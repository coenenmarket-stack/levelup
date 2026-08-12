const KEY = (uid: string) => `levelup_coach_chat_v1__${uid}`;
const MAX_MESSAGES = 40;

export type CoachChatMsg = {
  role: "coach" | "you";
  text: string;
  fallback?: boolean;
};

export function readCoachChatLocal(uid: string): CoachChatMsg[] {
  try {
    const raw = localStorage.getItem(KEY(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachChatMsg[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && (m.role === "coach" || m.role === "you") && typeof m.text === "string")
      .slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

export function writeCoachChatLocal(uid: string, messages: CoachChatMsg[]): void {
  try {
    const slim = messages
      .filter((m) => m.role === "coach" || m.role === "you")
      .map(({ role, text, fallback }) => ({
        role,
        text,
        ...(fallback ? { fallback: true } : {}),
      }))
      .slice(-MAX_MESSAGES);
    localStorage.setItem(KEY(uid), JSON.stringify(slim));
  } catch {
    /* quota / private mode */
  }
}

export function clearCoachChatLocal(uid: string): void {
  try {
    localStorage.removeItem(KEY(uid));
  } catch {
    /* ignore */
  }
}
