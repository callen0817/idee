import { cn } from "@/lib/utils";

export function PhoneConceptFrame({ children, className, label = "IDee concept interface" }: { children: React.ReactNode; className?: string; label?: string }) {
  return <figure aria-label={label} className={cn("relative mx-auto aspect-[9/19.5] w-full max-w-[330px] rounded-[3.1rem] border-[7px] border-foreground/90 bg-background p-2 shadow-depth", className)}><div className="absolute left-1/2 top-3 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-foreground" /><div className="h-full overflow-hidden rounded-[2.45rem] bg-background">{children}</div></figure>;
}