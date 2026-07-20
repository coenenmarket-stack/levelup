import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useGame } from "@/lib/game";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, LogOut, Trash2, Lock, Mail, ShieldAlert, X, Check, Loader2, Upload } from "lucide-react";
import { compressAvatar } from "@/lib/imageUpload";

const AVATAR_CLASSES = [
  { key: "warrior", name: "Warrior", emoji: "⚔️" },
  { key: "mage", name: "Mage", emoji: "🧙" },
  { key: "ranger", name: "Ranger", emoji: "🏹" },
  { key: "rogue", name: "Rogue", emoji: "🗡️" },
  { key: "creator", name: "Creator", emoji: "🎨" },
  { key: "entrepreneur", name: "Entrepreneur", emoji: "💼" },
  { key: "tradesman", name: "Tradesman", emoji: "🛠️" },
  { key: "parent", name: "Parent", emoji: "👨‍👩‍👧" },
];

const STARTING_CLASSES = [
  { key: "entrepreneur", name: "Entrepreneur", emoji: "💼" },
  { key: "tradesman", name: "Tradesman", emoji: "🛠️" },
  { key: "parent", name: "Parent", emoji: "👨‍👩‍👧" },
  { key: "athlete", name: "Athlete", emoji: "🏃" },
  { key: "student", name: "Student", emoji: "📚" },
  { key: "creator", name: "Creator", emoji: "🎨" },
  { key: "professional", name: "Professional", emoji: "🧠" },
];

const LIFE_GOALS = [
  "Lose Weight", "Build Wealth", "Get Organized", "Improve Relationships",
  "Start a Business", "Advance My Career", "Become Debt Free",
  "Learn New Skills", "Improve Mental Health",
];

type Panel = null | "profile" | "avatar" | "class" | "goals" | "password" | "delete";

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { me, logout, changePassword, updateSettings, deleteAccount } = useAuth();
  const { character } = useGame();
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast } = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);

  // Field-local drafts
  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [lifeGoal, setLifeGoal] = useState("");
  const [avatar, setAvatar] = useState("");
  const [className, setClassName] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    if (!character) return;
    setName(character.name);
    setPronouns(character.pronouns ?? "");
    setLifeGoal(character.lifeGoal);
    setAvatar(character.avatar);
    setClassName(character.className);
    setGoals(character.goals ?? []);
  }, [character]);

  const saveCharacter = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const res = await apiRequest("PATCH", "/api/character", fields);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/character"] });
      toast({ title: "Saved" });
      setPanel(null);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't save", description: parseError(err), variant: "destructive" });
    },
  });

  const handleChangePassword = async () => {
    setBusy(true);
    try {
      await changePassword(currentPw, newPw);
      toast({ title: "Password updated" });
      setCurrentPw(""); setNewPw(""); setPanel(null);
    } catch (err: any) {
      toast({ title: "Couldn't change password", description: parseError(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete !== "DELETE") {
      toast({ title: "Type DELETE to confirm", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await deleteAccount();
      toast({ title: "Account deleted" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Couldn't delete", description: parseError(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!character || !me) return null;

  return (
    <div className="space-y-5">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and your character.</p>
      </div>

      {/* Account card */}
      <section className="surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate" data-testid="text-email">{me.email}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {me.emailVerified ? <><Check className="w-3 h-3 text-emerald-400" /> Verified</> : "Unverified"}
              <span>·</span>
              <span className="capitalize">{me.provider} account</span>
            </div>
          </div>
        </div>
      </section>

      {/* Character section */}
      <SettingsGroup title="Character">
        <Row label="Edit profile" sub={`${character.name}${character.pronouns ? " · " + character.pronouns : ""}`} onClick={() => setPanel("profile")} testId="row-edit-profile" />
        <Row label="Change avatar" sub={`Current: ${AVATAR_CLASSES.find(a => a.key === character.avatar)?.name ?? "Unknown"}`} onClick={() => setPanel("avatar")} testId="row-change-avatar" />
        <Row label="Change class" sub={`Current: ${STARTING_CLASSES.find(c => c.key === character.className)?.name ?? "Unknown"}`} onClick={() => setPanel("class")} testId="row-change-class" />
        <Row label="Update life goals" sub={`${goals.length} selected`} onClick={() => setPanel("goals")} testId="row-update-goals" />
      </SettingsGroup>

      {/* Preferences */}
      <SettingsGroup title="Preferences">
        <ToggleRow
          label="Notifications"
          sub="Daily quest reminders and streak alerts"
          value={me.notificationsEnabled}
          onChange={(v) => updateSettings({ notificationsEnabled: v })}
          testId="toggle-notifications"
        />
        <ToggleRow
          label="Dark mode"
          sub="Recommended for the RPG vibe"
          value={theme === "dark"}
          onChange={() => toggleTheme()}
          testId="toggle-dark-mode"
        />
      </SettingsGroup>

      {/* Security */}
      <SettingsGroup title="Security">
        {me.provider === "password" && (
          <Row icon={<Lock className="w-4 h-4 text-muted-foreground" />} label="Change password" onClick={() => setPanel("password")} testId="row-change-password" />
        )}
        <Row icon={<LogOut className="w-4 h-4 text-muted-foreground" />} label="Sign out" onClick={async () => { await logout(); navigate("/"); }} testId="row-logout" />
        <Row danger icon={<Trash2 className="w-4 h-4 text-destructive" />} label="Delete account" onClick={() => setPanel("delete")} testId="row-delete" />
      </SettingsGroup>

      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-2 pb-1">
        Level Up Life · v1.0
      </p>

      {/* Panels */}
      {panel === "profile" && (
        <Sheet onClose={() => setPanel(null)} title="Edit profile">
          <div className="space-y-3">
            <Field label="Character name">
              <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-name" />
            </Field>
            <Field label="Pronouns (optional)">
              <Input value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="e.g. she/her" data-testid="input-edit-pronouns" />
            </Field>
            <Field label="Life goal (one sentence)">
              <Input value={lifeGoal} onChange={(e) => setLifeGoal(e.target.value)} data-testid="input-edit-lifegoal" />
            </Field>
            <SheetPrimary
              busy={saveCharacter.isPending}
              onClick={() => saveCharacter.mutate({ name, pronouns: pronouns || null, lifeGoal })}
              testId="button-save-profile"
            >
              Save profile
            </SheetPrimary>
          </div>
        </Sheet>
      )}

      {panel === "avatar" && (
        <Sheet onClose={() => setPanel(null)} title="Change avatar">
          {/* Current avatar preview + upload controls */}
          <div className="flex items-center gap-3 surface rounded-xl p-3">
            <div className="w-16 h-16 rounded-xl bg-secondary/40 border border-card-border flex items-center justify-center overflow-hidden shrink-0">
              {character?.photoURL
                ? <img src={character.photoURL} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-2xl">{AVATAR_CLASSES.find(a => a.key === character?.avatar)?.emoji ?? "🛡️"}</span>}
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              <label className="rounded-lg px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer hover-elevate flex items-center gap-1.5" data-testid="button-upload-avatar">
                <Upload className="w-3.5 h-3.5" />
                {character?.photoURL ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    try {
                      const dataUrl = await compressAvatar(f);
                      saveCharacter.mutate({ photoURL: dataUrl });
                    } catch (err: any) {
                      toast({ title: "Couldn't load image", description: err?.message ?? "Try a smaller file.", variant: "destructive" });
                    }
                  }}
                />
              </label>
              {character?.photoURL && (
                <button
                  type="button"
                  onClick={() => saveCharacter.mutate({ photoURL: null })}
                  data-testid="button-remove-photo"
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover-elevate flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Remove photo
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Or pick a preset avatar below. Picking one keeps your photo unless you remove it.</p>
          <div className="grid grid-cols-4 gap-2.5">
            {AVATAR_CLASSES.map((a) => (
              <button
                key={a.key} onClick={() => setAvatar(a.key)}
                data-testid={`button-pick-avatar-${a.key}`}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 ${avatar === a.key ? "bg-primary/15 border-2 border-primary" : "surface hover-elevate border-2 border-transparent"}`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-[10px] font-semibold">{a.name}</span>
              </button>
            ))}
          </div>
          <SheetPrimary busy={saveCharacter.isPending} onClick={() => saveCharacter.mutate({ avatar })} testId="button-save-avatar">
            Save avatar
          </SheetPrimary>
        </Sheet>
      )}

      {panel === "class" && (
        <Sheet onClose={() => setPanel(null)} title="Change class">
          <div className="space-y-2">
            {STARTING_CLASSES.map((c) => (
              <button
                key={c.key} onClick={() => setClassName(c.key)}
                data-testid={`button-pick-class-${c.key}`}
                className={`w-full rounded-xl px-3 py-2.5 flex items-center gap-2.5 ${className === c.key ? "bg-primary/15 border-2 border-primary" : "surface hover-elevate border-2 border-transparent"}`}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className="font-semibold text-sm">{c.name}</span>
              </button>
            ))}
          </div>
          <SheetPrimary busy={saveCharacter.isPending} onClick={() => saveCharacter.mutate({ className })} testId="button-save-class">
            Save class
          </SheetPrimary>
        </Sheet>
      )}

      {panel === "goals" && (
        <Sheet onClose={() => setPanel(null)} title="Update life goals">
          <div className="grid grid-cols-2 gap-2">
            {LIFE_GOALS.map((g) => {
              const selected = goals.includes(g);
              return (
                <button
                  key={g} onClick={() => setGoals(selected ? goals.filter(x => x !== g) : [...goals, g])}
                  data-testid={`button-toggle-goal-${g.replace(/\s+/g, "-").toLowerCase()}`}
                  className={`rounded-lg px-3 py-2.5 text-sm text-left ${selected ? "bg-primary/15 border-2 border-primary text-foreground" : "surface border-2 border-transparent text-muted-foreground hover-elevate"}`}
                >
                  {g}
                </button>
              );
            })}
          </div>
          <SheetPrimary busy={saveCharacter.isPending} onClick={() => saveCharacter.mutate({ goals })} testId="button-save-goals">
            Save goals
          </SheetPrimary>
        </Sheet>
      )}

      {panel === "password" && (
        <Sheet onClose={() => setPanel(null)} title="Change password">
          <div className="space-y-3">
            <Field label="Current password">
              <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} data-testid="input-current-password" />
            </Field>
            <Field label="New password" hint="At least 8 characters">
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} data-testid="input-new-password" />
            </Field>
            <SheetPrimary busy={busy} onClick={handleChangePassword} testId="button-save-password">
              Update password
            </SheetPrimary>
          </div>
        </Sheet>
      )}

      {panel === "delete" && (
        <Sheet onClose={() => setPanel(null)} title="Delete account" danger>
          <div className="surface rounded-xl p-3.5 flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">This permanently wipes your character, quests, achievements, and history. This cannot be undone.</p>
          </div>
          <Field label="Type DELETE to confirm">
            <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder="DELETE" data-testid="input-confirm-delete" />
          </Field>
          <button
            onClick={handleDelete} disabled={busy || confirmDelete !== "DELETE"} data-testid="button-confirm-delete"
            className="w-full rounded-xl py-3 bg-destructive text-destructive-foreground font-semibold hover-elevate active-elevate flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Delete my account
          </button>
        </Sheet>
      )}
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-1">{title}</h2>
      <div className="surface rounded-2xl divide-y divide-card-border overflow-hidden">{children}</div>
    </section>
  );
}

function Row({ label, sub, onClick, icon, danger, testId }: { label: string; sub?: string; onClick?: () => void; icon?: React.ReactNode; danger?: boolean; testId?: string }) {
  return (
    <button onClick={onClick} data-testid={testId}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover-elevate ${danger ? "text-destructive" : ""}`}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function ToggleRow({ label, sub, value, onChange, testId }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );
}

function Sheet({ onClose, title, children, danger }: { onClose: () => void; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md bg-card border-t md:border md:rounded-2xl border-card-border rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto pb-safe"
        data-testid="sheet"
      >
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-extrabold tracking-tight ${danger ? "text-destructive" : ""}`}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover-elevate flex items-center justify-center" aria-label="Close" data-testid="button-close-sheet">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function SheetPrimary({ children, busy, onClick, testId }: { children: React.ReactNode; busy?: boolean; onClick: () => void; testId?: string }) {
  return (
    <button onClick={onClick} disabled={busy} data-testid={testId}
      className="w-full rounded-xl py-3 bg-primary text-primary-foreground font-semibold hover-elevate active-elevate flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function parseError(err: any): string {
  const msg = err?.message ?? "Something went wrong";
  const m = String(msg).match(/^\d+:\s*(\{.*\})$/);
  if (m) { try { return JSON.parse(m[1]).error ?? msg; } catch { /* ignore */ } }
  return msg;
}
