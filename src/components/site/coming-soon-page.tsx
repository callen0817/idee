import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PublicShell } from "./public-shell";
import { PageIntro } from "./page-intro";

export function ComingSoonPage({ eyebrow, title, copy, ideas }: { eyebrow: string; title: string; copy: string; ideas: string[] }) {
  return <PublicShell><PageIntro eyebrow={eyebrow} title={title} copy={copy} status="Coming soon" /><section className="px-5 pb-28 sm:px-8"><div className="mx-auto max-w-7xl border-y border-border py-12"><div className="grid gap-8 md:grid-cols-3">{ideas.map((idea, index) => <div key={idea}><span className="text-xs text-muted-foreground">0{index + 1}</span><h2 className="mt-8 font-display text-2xl">{idea}</h2></div>)}</div><Button className="mt-14" asChild><Link to="/early-access">Join early access <ArrowUpRight /></Link></Button></div></section></PublicShell>;
}