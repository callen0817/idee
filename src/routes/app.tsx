import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/site/public-shell";
import { PageIntro } from "@/components/site/page-intro";
import { SectionHeading } from "@/components/brand/section-heading";
import { StatusLabel } from "@/components/brand/status-label";
import { Button } from "@/components/ui/button";
import { TodayScreen } from "@/components/product/today-screen";
import { LivingMap } from "@/components/product/living-map";
import { SocialProfile } from "@/components/product/social-profile";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "The IDee app — Today, Map, People, Play, You" },
      {
        name: "description",
        content:
          "Concept screens for the IDee app: a considered Today view, a Living Map of your city, People worth knowing, Play, and your Social Value.",
      },
      { property: "og:title", content: "The IDee app — Today, Map, People, Play, You" },
      {
        property: "og:description",
        content: "Concept interface screens for the IDee app. In development.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});

const screens = [
  ["Today", "One clear view of your day, and one clear action."],
  ["Map", "The world as the interface — culture, people and quests nearby."],
  ["People", "Follow, Connect, and see who you should meet."],
  ["Play", "XP, Credits, Heat, Quests and Achievements from real action."],
  ["You", "Your Social Value across independent dimensions."],
];

function AppPage() {
  return (
    <PublicShell>
      <PageIntro
        eyebrow="The app"
        title="IDee IN YOUR POCKET."
        copy="IDee starts as an app that respects your attention: it tells you where to go, then gets out of the way."
        status="In development"
      />

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-6 border-y border-border py-12 sm:grid-cols-2 lg:grid-cols-5">
          {screens.map(([name, copy]) => (
            <div key={name}>
              <h2 className="font-display text-2xl">{name}</h2>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="fog-scene px-5 pb-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Today"
            title="THE OPPOSITE OF A FEED."
            copy="No infinite scroll, no autoplay, no bait. A short, honest brief about your real day."
          />
          <TodayScreen />
        </div>
      </section>

      <section className="px-5 pb-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <LivingMap />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Map"
              title="YOUR CITY, LIVE."
              copy="Places, Worlds, events and people who are relevant right now — with privacy controls on by default."
            />
          </div>
        </div>
      </section>

      <section className="fog-scene px-5 pb-32 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <SectionHeading
            eyebrow="You"
            title="A PROFILE ABOUT WHAT YOU DO."
            copy="Your Social Value grows through participation, contribution, discovery and the relationships you make possible."
          />
          <div>
            <SocialProfile />
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StatusLabel demo>Concept screens</StatusLabel>
              <Button variant="glass" asChild>
                <Link to="/early-access">
                  Get early access <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
