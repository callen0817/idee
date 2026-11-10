import { StatusLabel } from "@/components/brand/status-label";

export function PageIntro({ eyebrow, title, copy, status }: { eyebrow?: string; title: React.ReactNode; copy: React.ReactNode; status?: string }) {
  return <section className="fog-scene flex min-h-[76vh] items-end px-5 pb-20 pt-32 sm:px-8 lg:pb-28"><div className="mx-auto w-full max-w-7xl"><div className="fade-up max-w-5xl">{status && <StatusLabel>{status}</StatusLabel>}{eyebrow && <p className="mb-6 mt-6 text-xs font-bold uppercase text-muted-foreground">{eyebrow}</p>}<h1 className="display-title mt-5 text-5xl sm:text-7xl lg:text-8xl">{title}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">{copy}</p></div></div></section>;
}