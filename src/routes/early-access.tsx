import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/site/public-shell";
import { SectionHeading } from "@/components/brand/section-heading";
import { StatusLabel } from "@/components/brand/status-label";
import { EarlyAccessForm } from "@/components/forms/early-access-form";

export const Route = createFileRoute("/early-access")({
  head: () => ({
    meta: [
      { title: "Get Early Access to IDee" },
      {
        name: "description",
        content:
          "Register interest in IDee — as someone joining, a venue, an event, a creator or a strategic partner.",
      },
      { property: "og:title", content: "Get Early Access to IDee" },
      {
        property: "og:description",
        content: "Tell us how you want to take part. IDee opens city by city.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EarlyAccessPage,
});

function EarlyAccessPage() {
  return (
    <PublicShell>
      <section className="fog-scene px-5 pb-28 pt-32 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div className="fade-up">
            <StatusLabel>In development</StatusLabel>
            <h1 className="display-title mt-6 text-5xl sm:text-6xl lg:text-7xl">GET EARLY ACCESS.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
              IDee opens a city at a time. Tell us where you are and how you want to take part, and we will
              come back to you when your place opens.
            </p>
            <div className="mt-12 border-t border-border pt-8">
              <SectionHeading eyebrow="What happens next" title="No noise, no charge" />
              <ul className="mt-8 grid gap-4 text-sm leading-6 text-muted-foreground">
                <li>We store only what you send us here.</li>
                <li>We contact you about your place opening, nothing else.</li>
                <li>Founders Edition is an interest list — devices are still in development.</li>
              </ul>
            </div>
          </div>
          <div className="min-w-0">
            <EarlyAccessForm />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
