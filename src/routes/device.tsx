import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { PageIntro } from "@/components/site/page-intro";
import { SectionHeading } from "@/components/brand/section-heading";
import { StatusLabel } from "@/components/brand/status-label";
import { DeviceConceptFrame } from "@/components/brand/device-concept-frame";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/device")({
  head: () => ({
    meta: [
      { title: "IDee device concept — a quiet, contextual object" },
      {
        name: "description",
        content:
          "The IDee hardware concept: smoked glass, dormant fog, a mint perimeter response and identity emerging from inside the glass. Coming soon.",
      },
      { property: "og:title", content: "IDee device concept — a quiet, contextual object" },
      { property: "og:description", content: "Phone first. Then something you wear. Concept only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DevicePage,
});

const sequence = [
  ["Dormant", "Smoked glass at rest. Nothing asks for you."],
  ["Awareness", "A subtle change as something relevant appears."],
  ["Response", "A mint perimeter answers your surroundings."],
  ["Identity", "A name emerges from inside the glass."],
  ["Context", "Only what matters in this moment."],
  ["Bump", "A precise, intentional connection."],
  ["Aura", "A brief expression of what just happened."],
  ["Rest", "Back to fog."],
];

const concepts = [
  ["IDee", "The everyday concept: presence, introductions, Bump and Today at a glance."],
  ["IDee Pro", "A more capable concept for people who live in the world all day."],
];

function DevicePage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Device"
        title="PHONE FIRST. THEN SOMETHING YOU WEAR."
        copy="A premium object rather than a screen: optical depth, ambient intelligence and restraint."
        status="Coming soon"
      />

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <DeviceConceptFrame />
        </div>
      </section>

      <section className="fog-scene px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Sequence" title="FOG, THEN RECOGNITION, THEN FOG AGAIN." />
          <ol className="mt-12 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {sequence.map(([step, copy], index) => (
              <li key={step} className="border-t border-border py-7">
                <span className="text-xs text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-5 font-display text-xl">{step}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 pb-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
          {concepts.map(([name, copy]) => (
            <article key={name} className="glass-surface rounded-[2rem] p-8">
              <StatusLabel>Concept</StatusLabel>
              <h2 className="mt-6 font-display text-3xl">{name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fog-scene px-5 pb-32 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            align="center"
            eyebrow="Founders Edition"
            title="REGISTER YOUR INTEREST."
            copy="No specifications, no dates and no pre-orders yet. Only an honest list for the people who want to be first."
          />
          <Button className="mt-10" asChild>
            <Link to="/early-access">
              Join the Founders Edition list <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
