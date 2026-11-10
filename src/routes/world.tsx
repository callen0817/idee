import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { PageIntro } from "@/components/site/page-intro";
import { SectionHeading } from "@/components/brand/section-heading";
import { Button } from "@/components/ui/button";
import { LivingMap } from "@/components/product/living-map";

export const Route = createFileRoute("/world")({
  head: () => ({
    meta: [
      { title: "The World Is The Interface | IDee" },
      {
        name: "description",
        content:
          "IDee reads the living world around you — places, moments, communities and Worlds you can walk into.",
      },
      { property: "og:title", content: "The World Is The Interface | IDee" },
      {
        property: "og:description",
        content: "A living map of real places and moments, not a feed of posts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorldPage,
});

const layers = [
  { title: "Places", copy: "Galleries, tables, studios, courts and rooms — described by what is happening, not by ratings." },
  { title: "Moments", copy: "Things beginning soon and near you. Temporary by design; nothing waits for a feed." },
  { title: "Communities", copy: "Groups who gather around a craft, a court, a kitchen or a cause." },
  { title: "Worlds", copy: "A neighbourhood, a festival or a venue, running as its own living layer for a while." },
];

function WorldPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="World"
        title={<>THE WORLD IS THE INTERFACE.</>}
        copy="No infinite scroll. IDee shows the part of the world you can actually reach today, and what it would mean to go there."
        status="In development"
      />
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <LivingMap />
        </div>
      </section>
      <section className="px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-14">
          <SectionHeading eyebrow="Layers" title="Four layers of the living World" />
          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {layers.map((layer, index) => (
              <div key={layer.title}>
                <span className="text-xs text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-6 font-display text-2xl">{layer.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{layer.copy}</p>
              </div>
            ))}
          </div>
          <Button className="mt-14" asChild>
            <Link to="/early-access">
              Get early access <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
