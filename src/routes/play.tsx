import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { PageIntro } from "@/components/site/page-intro";
import { SectionHeading } from "@/components/brand/section-heading";
import { StatusLabel } from "@/components/brand/status-label";
import { Button } from "@/components/ui/button";
import { CircleNetwork } from "@/components/product/circle-network";
import { heatStates, participation } from "@/data/content";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play Real Life — XP, Credits, Heat and Circle | IDee" },
      {
        name: "description",
        content:
          "How IDee turns real-world participation into progression: XP, Credits, Heat, Quests, Achievements, Auras, Circle and Bridge.",
      },
      { property: "og:title", content: "Play Real Life — XP, Credits, Heat and Circle | IDee" },
      {
        property: "og:description",
        content: "Progression earned by doing something real. Credits are reward value, not cryptocurrency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});

const glossary = [
  ["XP", "Non-purchasable progression earned through activity."],
  ["Level", "Longer-term accomplishment across time."],
  ["Credits", "Reward value earned through eligible participation. Not cryptocurrency."],
  ["Heat", "Your current momentum — it rises with participation and cools with rest."],
  ["Circle", "Meaningful network reach and diversity, not follower count."],
  ["Bridge", "The value created when you connect separated but relevant people."],
  ["Aura", "A visual expression of progression in the right contexts."],
  ["Quests", "Invitations to do something real, alone or with others."],
];

function PlayPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Play"
        title="STOP SCROLLING THROUGH LIFE. START PLAYING IT."
        copy="Everything in IDee is earned by leaving the house. Nothing here rewards you for staying longer on a screen."
        status="In development"
      />

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl border-y border-border py-12">
          <h2 className="display-title text-3xl sm:text-5xl">REAL ACTION. REAL PROGRESSION.</h2>
          <div className="mt-10 grid gap-x-10 sm:grid-cols-2">
            {participation.map(([action, reward]) => (
              <div key={action} className="flex items-center justify-between border-b border-border py-4">
                <span className="text-sm">{action}</span>
                <span className="text-xs font-bold uppercase text-primary">{reward}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fog-scene px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Heat" title="MOMENTUM YOU CAN FEEL." copy="Heat begins calm and mint, then warms as you participate. It always returns to rest." />
          <div className="mt-12 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {heatStates.map((state) => (
              <div key={state.name} className="glass-surface rounded-2xl p-5">
                <span className="block size-3 rounded-full" style={{ background: `var(--${state.tone})` }} />
                <p className="mt-6 text-sm font-semibold">{state.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Circle & Bridge"
            title="ONE INTRODUCTION CAN CHANGE YOUR MAP."
            copy="A single high-distance connection can add a city, several communities and new skill domains to your world."
          />
          <CircleNetwork />
        </div>
      </section>

      <section className="fog-scene px-5 pb-32 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Language" title="WHAT THE WORDS MEAN." />
          <dl className="mt-12 grid gap-x-12 sm:grid-cols-2">
            {glossary.map(([term, meaning]) => (
              <div key={term} className="border-b border-border py-6">
                <dt className="font-display text-xl">{term}</dt>
                <dd className="mt-2 text-sm leading-6 text-muted-foreground">{meaning}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <StatusLabel>Concept</StatusLabel>
            <Button variant="glass" asChild>
              <Link to="/early-access">
                Get early access <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
