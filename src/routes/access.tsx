import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { PageIntro } from "@/components/site/page-intro";
import { SectionHeading } from "@/components/brand/section-heading";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Access — How To Join IDee" },
      {
        name: "description",
        content:
          "IDee opens city by city. Here is how early access, Founders Edition interest and partner conversations work.",
      },
      { property: "og:title", content: "Access — How To Join IDee" },
      {
        property: "og:description",
        content: "Invited in stages, by place, so each World starts with real participation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccessPage,
});

const stages = [
  { title: "Register interest", copy: "Tell us where you are and how you want to take part. Nothing is charged and nothing is shared." },
  { title: "City by city", copy: "IDee opens as a place, not a launch date — enough people and places for a World to feel alive." },
  { title: "Invitations in waves", copy: "We invite in small groups so early Worlds keep their quality." },
  { title: "Devices come later", copy: "The IDee device concepts are in development. Founders Edition is an interest list only." },
];

function AccessPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Access"
        title={<>OPENED PLACE BY PLACE.</>}
        copy="IDee only works when a place is populated. So we open it a city at a time, in waves, and tell you plainly where things stand."
        status="In development"
      />
      <section className="px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-14">
          <SectionHeading eyebrow="How it works" title="Four stages" />
          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {stages.map((stage, index) => (
              <div key={stage.title}>
                <span className="text-xs text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-6 font-display text-2xl">{stage.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{stage.copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/early-access">
                Get early access <ArrowUpRight />
              </Link>
            </Button>
            <Button variant="glass" asChild>
              <Link to="/trust">Safety & trust</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
