import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useGame } from "@/lib/game";
import type { Reward } from "@/lib/types";
import { Plus, Trash2, Loader2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const REWARD_ICONS = ["☕", "🎬", "🛠️", "🏞️", "🍔", "🎮", "📚", "🎁", "💎", "🍷", "🛒", "✈️"];

export default function Shop() {
  const { character } = useGame();
  const { data: rewards } = useQuery<Reward[]>({ queryKey: ["/api/rewards"] });
  const qc = useQueryClient();
  const { toast } = useToast();

  const redeemMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/rewards/${id}/redeem`)).json(),
    onSuccess: (data: { reward: Reward }) => {
      qc.invalidateQueries({ queryKey: ["/api/rewards"] });
      qc.invalidateQueries({ queryKey: ["/api/character"] });
      toast({ title: `${data.reward.icon}  Redeemed`, description: `Enjoy your ${data.reward.name}.` });
    },
    onError: (e: any) => toast({ title: "Can't redeem yet", description: e.message, variant: "destructive" }),
  });

  const delMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/rewards/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/rewards"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Rewards shop</h1>
          <p className="text-sm text-muted-foreground">Trade XP for real-life treats.</p>
        </div>
        <NewRewardButton />
      </div>

      <div className="surface rounded-2xl p-4 flex items-center gap-3 gold-glow" data-testid="card-spendable">
        <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Spendable XP</div>
          <div className="font-num text-2xl font-bold gold-text" data-testid="text-spendable-xp">{(character?.spendableXp ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="space-y-2.5">
        {(rewards ?? []).map((r) => {
          const canAfford = (character?.spendableXp ?? 0) >= r.cost;
          return (
            <div key={r.id} className="surface rounded-xl p-4 flex items-center gap-3" data-testid={`row-reward-${r.id}`}>
              <div className="w-12 h-12 rounded-xl bg-secondary/40 border border-card-border flex items-center justify-center text-2xl">{r.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{r.name}</div>
                {r.description && <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>}
                {r.redeemed > 0 && <div className="text-[10px] text-muted-foreground mt-0.5">Redeemed <span className="font-num">{r.redeemed}</span>×</div>}
              </div>
              <button
                onClick={() => redeemMut.mutate(r.id)}
                disabled={!canAfford || redeemMut.isPending}
                data-testid={`button-redeem-${r.id}`}
                className={`px-3 py-2 rounded-lg text-sm font-bold hover-elevate active-elevate ${canAfford ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                <span className="font-num">{r.cost.toLocaleString()}</span> XP
              </button>
              <button onClick={() => { if (confirm("Remove this reward?")) delMut.mutate(r.id); }} className="text-muted-foreground hover:text-destructive p-1 hover-elevate rounded" data-testid={`button-delete-reward-${r.id}`} aria-label="Delete reward">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {!rewards?.length && (
          <div className="surface rounded-xl p-8 text-center text-muted-foreground">No rewards yet. Add one to motivate yourself.</div>
        )}
      </div>
    </div>
  );
}

function NewRewardButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎁");
  const [cost, setCost] = useState("100");

  const mut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/rewards", { name, description: description || null, icon, cost: Number(cost) })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/rewards"] });
      setOpen(false); setName(""); setDescription(""); setCost("100"); setIcon("🎁");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button data-testid="button-new-reward" className="surface-raised rounded-lg px-3 py-2 flex items-center gap-1.5 hover-elevate active-elevate text-sm font-semibold">
          <Plus className="w-4 h-4" /> New
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader><DialogTitle>Create a reward</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Icon</Label>
            <div className="mt-1.5 grid grid-cols-6 gap-2">
              {REWARD_ICONS.map((a) => (
                <button key={a} onClick={() => setIcon(a)} data-testid={`button-reward-icon-${a}`}
                  className={`aspect-square rounded-lg border text-xl flex items-center justify-center hover-elevate ${icon === a ? "border-primary bg-primary/10" : "border-card-border bg-secondary/40"}`}
                >{a}</button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="r-name">Name</Label>
            <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Steak dinner" data-testid="input-reward-name" />
          </div>
          <div>
            <Label htmlFor="r-desc">Description</Label>
            <Textarea id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-reward-description" />
          </div>
          <div>
            <Label htmlFor="r-cost">Cost (XP)</Label>
            <Input id="r-cost" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ""))} data-testid="input-reward-cost" />
          </div>
          <button
            disabled={!name || !cost || mut.isPending}
            onClick={() => mut.mutate()}
            data-testid="button-create-reward"
            className="w-full rounded-lg py-2.5 bg-primary text-primary-foreground font-semibold hover-elevate active-elevate disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Add reward
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
