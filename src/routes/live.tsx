import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/site/coming-soon-page";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live — Worlds, Moments and Find | IDee" },
      {
        name: "description",
        content:
          "Live is where IDee Worlds run in real time: what is happening now, who is around, and how to find your people.",
      },
      { property: "og:title", content: "Live — Worlds, Moments and Find | IDee" },
      {
        property: "og:description",
        content: "Temporary Worlds, live moments and Find. In development.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  return (
    <ComingSoonPage
      eyebrow="Live"
      title="WHAT IS HAPPENING, RIGHT NOW."
      copy="Live turns a neighbourhood, venue or festival into a temporary World — with its own moments, Quests and people to meet. Concept in development."
      ideas={[
        "Worlds that run for a night, a weekend or a season",
        "Moments you can join in the next thirty minutes",
        "Find — the people worth meeting where you already are",
      ]}
    />
  );
}
