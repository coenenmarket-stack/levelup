import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGame } from "@/lib/game";
import { apiRequest } from "@/lib/queryClient";
import type { Quest, Category } from "@/lib/types";
import { Plus, Loader2, Library, Search, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyProgressBar } from "@/components/quests/DailyProgressBar";
import { QuestRow } from "@/components/quests/QuestRow";
import { QuestSection } from "@/components/quests/QuestSection";
import { CatalogQuestCard } from "@/components/quests/CatalogQuestCard";
import { splitQuestsByCompletion, computeDailyProgress } from "@/lib/questUtils";
import {
  CATEGORY_KEYS,
  filterCatalog,
  type QuestCatalogItem,
  type QuestCatalogCategory,
} from "@/lib/questCatalog";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

const PAGE_SIZE = 20;

const diffMeta: Record<string, { label: string; xp: number; className: string }> = {
  easy: { label: "Easy", xp: 10, className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  medium: { label: "Medium", xp: 25, className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  hard: { label: "Hard", xp: 50, className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

export default function Quests() {
  const { completeQuest, completingQuestId } = useGame();
  const qc = useQueryClient();
  const { data: quests, isLoading } = useQuery<Quest[]>({ queryKey: ["/api/quests"] });
  const { data: cats } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const [mode, setMode] = useState<"mine" | "catalog">("mine");
  const [filter, setFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const delMut = useMutation({
    mutationFn: async (id: string | number) => {
      await apiRequest("DELETE", `/api/quests/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/quests"] }),
  });

  const filtered = (quests ?? []).filter((q) => (filter === "all" ? true : q.difficulty === filter));
  const { active, completedToday } = splitQuestsByCompletion(filtered);
  const progress = computeDailyProgress(active, completedToday);

  async function requestComplete(q: Quest) {
    if (q.difficulty === "hard") {
      const ok = await confirm({
        title: "Complete hard quest?",
        description: `"${q.title}" awards +${q.xpReward} XP. You can only complete it once today.`,
        confirmLabel: "Mark complete",
      });
      if (!ok) return;
    }
    completeQuest(q);
  }

  async function requestDelete(q: Quest) {
    const ok = await confirm({
      title: "Delete this quest?",
      description: `"${q.title}" will be removed from your list. Progress for today is unaffected.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    delMut.mutate(q.id);
  }

  return (
    <div className="space-y-4">
      {confirmDialog}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">
          Quests
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete active quests for XP — or browse 1,000 catalog missions across all five skills.
        </p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "mine" | "catalog")}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="mine" data-testid="tab-my-quests">
            My Quests
          </TabsTrigger>
          <TabsTrigger value="catalog" data-testid="tab-quest-catalog">
            <Library className="w-3.5 h-3.5 mr-1.5" />
            Catalog
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "mine" ? (
        <>
          {isLoading && !quests ? (
            <div className="space-y-2.5" data-testid="quests-loading">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {progress.total > 0 && <DailyProgressBar progress={progress} data-testid="quests-daily-progress" />}

              <div className="flex items-center gap-2">
                <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-1">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="all" data-testid="tab-all">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="easy" data-testid="tab-easy">
                      Easy
                    </TabsTrigger>
                    <TabsTrigger value="medium" data-testid="tab-medium">
                      Medium
                    </TabsTrigger>
                    <TabsTrigger value="hard" data-testid="tab-hard">
                      Hard
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <NewQuestButton cats={cats ?? []} />
              </div>

              <QuestSection
                title="Active Quests"
                count={active.length}
                emptyMessage={
                  completedToday.length > 0
                    ? "All caught up for now — nice work."
                    : "No quests yet. Create one or add from the Catalog."
                }
                emptyAction={
                  <button
                    type="button"
                    onClick={() => setMode("catalog")}
                    data-testid="button-empty-browse-catalog"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover-elevate"
                  >
                    <Library className="w-4 h-4" />
                    Browse Catalog
                  </button>
                }
                data-testid="section-active-quests"
              >
                {active.map((q) => (
                  <QuestRow
                    key={q.id}
                    quest={q}
                    variant="active"
                    onComplete={() => void requestComplete(q)}
                    onDelete={() => void requestDelete(q)}
                    isCompleting={completingQuestId === String(q.id)}
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
                  <QuestRow key={q.id} quest={q} variant="completed" expanded />
                ))}
              </QuestSection>
            </>
          )}
        </>
      ) : (
        <CatalogBrowser quests={quests ?? []} />
      )}
    </div>
  );
}

function CatalogBrowser({ quests }: { quests: Quest[] }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<QuestCatalogCategory | "all">("all");
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [addingId, setAddingId] = useState<string | null>(null);

  const ownedCatalogIds = useMemo(() => {
    const set = new Set<string>();
    for (const q of quests) {
      if (q.catalogId) set.add(String(q.catalogId));
    }
    return set;
  }, [quests]);

  const results = useMemo(
    () =>
      filterCatalog({
        category: category === "all" ? undefined : category,
        difficulty: difficulty === "all" ? undefined : difficulty,
        search,
      }),
    [category, difficulty, search],
  );

  const pageItems = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;

  const addMut = useMutation({
    mutationFn: async (item: QuestCatalogItem) => {
      setAddingId(item.id);
      const res = await apiRequest("POST", "/api/quests", {
        title: item.title,
        description: item.description,
        category: item.category,
        difficulty: item.difficulty,
        xpReward: item.xpReward,
        isDaily: item.isDaily,
        catalogId: item.id,
      });
      return res.json();
    },
    onSettled: () => setAddingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/quests"] }),
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Search catalog…"
          className="pl-9"
          data-testid="input-catalog-search"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-swipe-scroll data-testid="catalog-category-chips">
        {(["all", ...CATEGORY_KEYS] as const).map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setVisibleCount(PAGE_SIZE);
              }}
              data-testid={`catalog-cat-${c}`}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-card-border hover-elevate"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      <Tabs
        value={difficulty}
        onValueChange={(v) => {
          setDifficulty(v as typeof difficulty);
          setVisibleCount(PAGE_SIZE);
        }}
      >
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="easy">Easy</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
          <TabsTrigger value="hard">Hard</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="text-xs text-muted-foreground px-0.5" data-testid="catalog-result-count">
        {results.length} quests
        {hasMore ? ` · showing ${pageItems.length}` : ""}
      </div>

      <div className="space-y-2.5">
        {pageItems.length === 0 ? (
          <div className="surface rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No catalog quests match these filters.
          </div>
        ) : (
          pageItems.map((item) => {
            const owned = ownedCatalogIds.has(item.id);
            return (
              <CatalogQuestCard
                key={item.id}
                item={item}
                owned={owned}
                adding={addingId === item.id}
                disabled={addMut.isPending}
                onAdd={() => {
                  if (owned || addMut.isPending) return;
                  addMut.mutate(item);
                }}
              />
            );
          })
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold surface hover-elevate"
          data-testid="button-catalog-load-more"
        >
          Load more
        </button>
      )}
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
        title,
        description: description || null,
        category,
        difficulty,
        xpReward,
        isDaily,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/quests"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setCustomXp("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          data-testid="button-new-quest"
          className="surface-raised rounded-lg px-3 py-2 flex items-center gap-1.5 hover-elevate active-elevate text-sm font-semibold"
        >
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
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meditate 10 minutes"
              data-testid="input-title"
            />
          </div>
          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this matters"
              data-testid="input-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.key}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger data-testid="select-difficulty">
                  <SelectValue />
                </SelectTrigger>
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
              <Input
                id="xp"
                inputMode="numeric"
                value={customXp}
                onChange={(e) => setCustomXp(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={String(diffMeta[difficulty].xp)}
                data-testid="input-xp"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={isDaily ? "daily" : "side"} onValueChange={(v) => setIsDaily(v === "daily")}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
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
