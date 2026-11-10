import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { PageIntro } from "@/components/site/page-intro";
import { SectionHeading } from "@/components/brand/section-heading";
import { StatusLabel } from "@/components/brand/status-label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "For Business — Verified Real-World Action | IDee" },
      {
        name: "description",
        content:
          "IDee is built around real-world action: people arriving, participating and returning. For venues, brands, events and institutions.",
      },
      { property: "og:title", content: "For Business — Verified Real-World Action | IDee" },
      {
        property: "og:description",
        content: "Move attention into arrival. Concept programme in development.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessPage,
});

const outcomes = [
  { title: "Fill the quiet hours", copy: "Invite participation when your room is empty, instead of discounting to everyone at once." },
  { title: "Reward the real visit", copy: "Progression is earned by turning up and taking part, not by posting about it." },
  { title: "Understand contribution", copy: "See which moments create returning people and new connections in your area." },
];

const verticals = [
  ["Venues & hospitality", "Tables, rooms, courts and off-peak capacity."],
  ["Events & festivals", "A living World for the length of your event."],
  ["Culture & institutions", "Galleries, museums, libraries and civic programmes."],
  ["Brands & partners", "Presence built on real participation, not impressions."],
  ["Education", "Campus life, societies and skill communities."],
  ["Cities & communities", "Neighbourhood participation and local impact."],
];

function BusinessPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="For business"
        title={<>ATTENTION IS CHEAP. ARRIVAL ISN'T.</>}
        copy="IDee exists to move people into rooms, streets and studios. Businesses can take part in that, and see what real participation produces."
        status="In development"
      />
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-14">
          <SectionHeading eyebrow="Outcomes" title="What participation is worth" />
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {outcomes.map((item, index) => (
              <div key={item.title}>
                <span className="text-xs text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-6 font-display text-2xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="glass-surface rounded-[2rem] p-8 sm:p-12">
            <StatusLabel>Concept</StatusLabel>
            <h2 className="display-title mt-6 text-3xl sm:text-4xl">CPVA — Cost Per Verified Action</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              A future measure we are exploring: value attached to a verified real-world action rather than a
              click or an impression. Not available today.
            </p>
          </div>
        </div>
      </section>
      <section className="px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-14">
          <SectionHeading eyebrow="Who this is for" title="Places where real life happens" />
          <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {verticals.map(([title, copy]) => (
              <div key={title} className="border-t border-border pt-5">
                <h3 className="font-display text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
          <Button className="mt-14" asChild>
            <Link to="/early-access">
              Start a conversation <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
