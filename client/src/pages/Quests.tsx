import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGame } from "@/lib/game";
import { apiRequest } from "@/lib/queryClient";
import type { Quest, Category } from "@/lib/types";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyProgressBar } from "@/components/quests/DailyProgressBar";
import { QuestRow } from "@/components/quests/QuestRow";
import { QuestSection } from "@/components/quests/QuestSection";
import { splitQuestsByCompletion, computeDailyProgress } from "@/lib/questUtils";

const diffMeta: Record<string, { label: string; xp: number; className: string }> = {
  easy:   { label: "Easy",   xp: 10, className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  medium: { label: "Medium", xp: 25, className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  hard:   { label: "Hard",   xp: 50, className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

export default function Quests() {
  const { completeQuest, isCompleting } = useGame();
  const qc = useQueryClient();
  const { data: quests } = useQuery<Quest[]>({ queryKey: ["/api/quests"] });
  const { data: cats } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const [filter, setFilter] = useState<"all" | "easy" | "medium" | "hard">("all");

  const delMut = useMutation({
    mutationFn: async (id: string | number) => {
      await apiRequest("DELETE", `/api/quests/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/quests"] }),
  });

  const filtered = (quests ?? []).filter(q => filter === "all" ? true : q.difficulty === filter);
  const { active, completedToday } = splitQuestsByCompletion(filtered);
  const progress = computeDailyProgress(active, completedToday);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Quests</h1>
        <p className="text-sm text-muted-foreground">Pick a quest, get the XP. Daily quests reset every morning.</p>
      </div>

      {progress.total > 0 && <DailyProgressBar progress={progress} data-testid="quests-daily-progress" />}

      <div className="flex items-center gap-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="flex-1">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="easy" data-testid="tab-easy">Easy</TabsTrigger>
            <TabsTrigger value="medium" data-testid="tab-medium">Medium</TabsTrigger>
            <TabsTrigger value="hard" data-testid="tab-hard">Hard</TabsTrigger>
          </TabsList>
        </Tabs>
        <NewQuestButton cats={cats ?? []} />
      </div>

      <QuestSection
        title="Active Quests"
        count={active.length}
        emptyMessage={completedToday.length > 0 ? "All caught up for now — nice work." : "No quests yet. Create one to get started."}
        data-testid="section-active-quests"
      >
        {active.map((q) => (
          <QuestRow
            key={q.id}
            quest={q}
            variant="active"
            onComplete={() => completeQuest(q)}
            onDelete={() => { if (confirm("Delete this quest?")) delMut.mutate(q.id); }}
            isCompleting={isCompleting}
            showDelete
          />
        ))}
      </QuestSection>

      <QuestSection
        title="Completed Today"
        count={completedToday.length}
        collapsible
        data-testid="section-completed-today"
      >
        {completedToday.map((q) => (
          <QuestRow
            key={q.id}
            quest={q}
            variant="completed"
            onCompleteAgain={!q.isDaily ? () => completeQuest(q) : undefined}
            isCompleting={isCompleting}
          />
        ))}
      </QuestSection>
    </div>
  );
}

function NewQuestButton({ cats }: { cats: Category[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("health");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [isDaily, setIsDaily] = useState(true);
  const [customXp, setCustomXp] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const xpReward = customXp ? Number(customXp) : diffMeta[difficulty].xp;
      const res = await apiRequest("POST", "/api/quests", {
        title, description: description || null, category, difficulty, xpReward, isDaily,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/quests"] });
      setOpen(false);
      setTitle(""); setDescription(""); setCustomXp("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button data-testid="button-new-quest" className="surface-raised rounded-lg px-3 py-2 flex items-center gap-1.5 hover-elevate active-elevate text-sm font-semibold">
          <Plus className="w-4 h-4" /> New
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Create a quest</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Meditate 10 minutes" data-testid="input-title" />
          </div>
          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why this matters" data-testid="input-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map(c => <SelectItem key={c.id} value={c.key}>{c.icon}  {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                <SelectTrigger data-testid="select-difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy · 10 XP</SelectItem>
                  <SelectItem value="medium">Medium · 25 XP</SelectItem>
                  <SelectItem value="hard">Hard · 50 XP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="xp">Custom XP (optional)</Label>
              <Input id="xp" inputMode="numeric" value={customXp} onChange={(e) => setCustomXp(e.target.value.replace(/[^0-9]/g, ""))} placeholder={String(diffMeta[difficulty].xp)} data-testid="input-xp" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={isDaily ? "daily" : "side"} onValueChange={(v) => setIsDaily(v === "daily")}>
                <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily quest</SelectItem>
                  <SelectItem value="side">Side quest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <button
            disabled={!title || mut.isPending}
            onClick={() => mut.mutate()}
            data-testid="button-create-quest"
            className="w-full rounded-lg py-2.5 bg-primary text-primary-foreground font-semibold hover-elevate active-elevate disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Add quest
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
