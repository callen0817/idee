import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/site/public-shell";
import { PageIntro } from "@/components/site/page-intro";
import { SectionHeading } from "@/components/brand/section-heading";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Safety & Trust | IDee" },
      {
        name: "description",
        content:
          "How IDee treats location, following, connection and family safety. Following never exposes where you are.",
      },
      { property: "og:title", content: "Safety & Trust | IDee" },
      {
        property: "og:description",
        content: "Three relationship levels, location that stays private, and protections for minors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrustPage,
});

const levels = [
  { title: "Follow", copy: "One-way interest. You see what someone chooses to share publicly. It never reveals their location." },
  { title: "Connect", copy: "Mutual and deliberate. Connection is how your Circle grows, and it can be ended at any time." },
  { title: "Trusted relationship", copy: "An explicit, additional agreement for closer visibility — used sparingly, and always revocable." },
];

const safeguards = [
  ["Location is never public", "Presence is shared with people you have chosen, for as long as you allow it."],
  ["Minors are protected by default", "Younger accounts have restricted discovery, no public presence and no adult-initiated contact."],
  ["Families can supervise", "Guardians can review relationships and participation without reading private conversations."],
  ["Nothing is scraped from you", "We do not build a shadow profile of your digital life to sell it onward."],
  ["Progress cannot be bought", "Because it can't be bought, it can't be used to pressure anyone."],
  ["You can leave with your record", "Your participation history belongs to you, including on the way out."],
];

function TrustPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Safety & trust"
        title={<>REAL LIFE NEEDS REAL SAFEGUARDS.</>}
        copy="IDee moves people towards each other. That only works if visibility is deliberate, location is private, and younger people are protected by default."
        status="In development"
      />
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-14">
          <SectionHeading eyebrow="Relationships" title="Three levels, clearly separated" />
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {levels.map((level, index) => (
              <div key={level.title} className="glass-surface rounded-[1.75rem] p-7">
                <span className="text-xs text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-6 font-display text-2xl">{level.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{level.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-14">
          <SectionHeading eyebrow="Safeguards" title="What we commit to" />
          <div className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {safeguards.map(([title, copy]) => (
              <div key={title} className="border-t border-border pt-5">
                <h3 className="font-display text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
          <Button variant="glass" className="mt-14" asChild>
            <Link to="/access">How access works</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
