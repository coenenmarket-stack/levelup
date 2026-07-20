import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { COMPLETED_SECTION_AUTO_COLLAPSE } from "@/lib/questUtils";

type Props = {
  title: string;
  count: number;
  emptyMessage?: string;
  collapsible?: boolean;
  autoCollapseThreshold?: number;
  children: ReactNode;
  "data-testid"?: string;
};

export function QuestSection({
  title,
  count,
  emptyMessage,
  collapsible = false,
  autoCollapseThreshold = COMPLETED_SECTION_AUTO_COLLAPSE,
  children,
  "data-testid": testId,
}: Props) {
  const defaultOpen = !collapsible || count <= autoCollapseThreshold;
  const [open, setOpen] = useState(defaultOpen);

  const header = (
    <div className="flex items-center justify-between px-0.5">
      <h2 className="text-sm font-bold tracking-tight uppercase text-muted-foreground">
        {title}{" "}
        <span className="font-num text-foreground">({count})</span>
      </h2>
      {collapsible && (
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      )}
    </div>
  );

  if (count === 0 && emptyMessage) {
    return (
      <section className="space-y-2.5" data-testid={testId}>
        {header}
        <div className="surface rounded-xl p-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      </section>
    );
  }

  if (count === 0) return null;

  if (!collapsible) {
    return (
      <section className="space-y-2.5" data-testid={testId}>
        {header}
        <div className="space-y-2.5">{children}</div>
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} data-testid={testId}>
      <section className="space-y-2.5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-0.5 hover-elevate rounded py-1"
            data-testid={testId ? `${testId}-toggle` : undefined}
            aria-expanded={open}
          >
            {header}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2.5">{children}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}
