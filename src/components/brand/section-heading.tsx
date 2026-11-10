import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, copy, align = "left", className }: { eyebrow?: string; title: React.ReactNode; copy?: React.ReactNode; align?: "left" | "center"; className?: string }) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="mb-5 text-xs font-bold uppercase text-muted-foreground">{eyebrow}</p>}
      <h2 className="display-title text-4xl text-foreground sm:text-6xl lg:text-7xl">{title}</h2>
      {copy && <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{copy}</p>}
    </div>
  );
}