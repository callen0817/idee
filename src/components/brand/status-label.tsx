import { DEMO_MODE } from "@/config/site";
import { cn } from "@/lib/utils";

export function StatusLabel({ children = "Concept", demo = false, className }: { children?: React.ReactNode; demo?: boolean; className?: string }) {
  return <span className={cn("inline-flex rounded-full border border-border bg-surface-glass px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground backdrop-blur-xl", className)}>{demo && DEMO_MODE ? "Demo · " : ""}{children}</span>;
}