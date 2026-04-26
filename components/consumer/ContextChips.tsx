import type { ContextChip } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface ContextChipsProps {
  chips: ContextChip[];
  className?: string;
}

export function ContextChips({ chips, className }: ContextChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((c) => (
        <span
          key={`${c.signalKey}-${c.label}`}
          className="inline-flex items-center gap-1 rounded-full bg-ios-muted px-2.5 py-1 text-xs leading-none text-foreground/80"
        >
          <span aria-hidden>{c.icon}</span>
          {c.label}
        </span>
      ))}
    </div>
  );
}
