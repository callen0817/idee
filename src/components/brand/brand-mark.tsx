import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center font-display text-xl font-semibold", className)} aria-label="IDee">
      IDee<span className="ml-1 inline-block size-2 rounded-full bg-primary shadow-mint" aria-hidden="true" />
    </span>
  );
}