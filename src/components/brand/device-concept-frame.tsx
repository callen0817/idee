import { cn } from "@/lib/utils";

export function DeviceConceptFrame({ className }: { className?: string }) {
  return (
    <div className={cn("group relative mx-auto w-full max-w-4xl py-20", className)}>
      <div className="absolute inset-x-[10%] top-1/2 h-24 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative flex aspect-[5/1] items-center justify-center overflow-hidden rounded-[3rem] border border-background/25 bg-surface-deep px-8 shadow-depth before:absolute before:inset-0 before:bg-gradient-to-b before:from-background/20 before:to-transparent">
        <span className="absolute right-6 top-6 size-2 rounded-full bg-primary opacity-70" />
        <div className="relative text-center text-background">
          <p className="text-xs font-bold uppercase text-background/50">People you should know</p>
          <p className="mt-2 font-display text-3xl sm:text-5xl">SARAH</p>
          <p className="mt-2 text-xs text-background/55 sm:text-sm">Culture · London · Bridge potential</p>
        </div>
      </div>
    </div>
  );
}