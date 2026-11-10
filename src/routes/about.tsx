import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { PageIntro } from "@/components/site/page-intro";
import { SectionHeading } from "@/components/brand/section-heading";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About IDee — Interactive Digital Encounter Engine" },
      {
        name: "description",
        content:
          "IDee is an operating system for participating in real life. Not a social network — a way of recognising social value.",
      },
      { property: "og:title", content: "About IDee — Interactive Digital Encounter Engine" },
      {
        property: "og:description",
        content: "Why we are building IDee, and what we refuse to build.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const principles = [
  ["We measure what happens because people know you", "Social value is the outcome of real relationships, not the size of an audience."],
  ["Time is spent outside, not inside", "IDee should end a session by sending you somewhere, then get out of the way."],
  ["No infinite feed", "There is nothing to scroll forever, because life isn't stored in a timeline."],
  ["Nothing is bought", "Progression comes from participation. There is no pay-to-win."],
  ["Privacy is structural", "Following never exposes where you are. Connection is mutual and deliberate."],
  ["We say what is real", "Anything in development is labelled as such, including on this site."],
];

function AboutPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="About"
        title={<>GO BECOME SOMEBODY.</>}
        copy={`${siteConfig.fullName}. We are building an operating system for participating in real life — so what you actually do, and who you actually know, counts for something.`}
        status={siteConfig.status}
      />
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-14">
          <SectionHeading eyebrow="Principles" title="What we hold to" />
          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {principles.map(([title, copy], index) => (
              <div key={title}>
                <span className="text-xs text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-5 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-14">
          <h2 className="display-title max-w-3xl text-3xl sm:text-5xl">
            SEE. REMEMBER. CONNECT.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
            IDee is early. The product concepts shown across this site are in development, and the numbers in
            our demonstrations are illustrative.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
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
