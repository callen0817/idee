import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/brand/section-heading";
import { StatusLabel } from "@/components/brand/status-label";
import { DeviceConceptFrame } from "@/components/brand/device-concept-frame";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/site/public-shell";
import { CircleNetwork } from "@/components/product/circle-network";
import { LivingMap } from "@/components/product/living-map";
import { SocialProfile } from "@/components/product/social-profile";
import { TodayScreen } from "@/components/product/today-screen";
import { EarlyAccessForm } from "@/components/forms/early-access-form";
import { heatStates, participation } from "@/data/content";
import londonImage from "@/assets/idee-irl-london.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IDee — Your life is bigger than your feed" },
      {
        name: "description",
        content:
          "IDee is an operating system for participating in real life: where to go, who to know, what to do, and how your world becomes larger.",
      },
      { property: "og:title", content: "IDee — Your life is bigger than your feed" },
      {
        property: "og:description",
        content: "Stop scrolling through life. Start playing it. IDee is in development.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <PublicShell>
      <section className="fog-scene flex min-h-[92vh] items-end px-5 pb-20 pt-36 sm:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="fade-up">
            <StatusLabel>In development</StatusLabel>
            <h1 className="display-title mt-8 max-w-5xl text-5xl sm:text-7xl lg:text-[7.5rem]">
              YOUR LIFE IS BIGGER THAN YOUR FEED.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              IDee is an operating system for participating in real life. See. Remember. Connect.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/early-access">
                  Get early access <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="glass" asChild>
                <Link to="/app">Discover IDee</Link>
              </Button>
            </div>
            <p className="mt-12 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Go become somebody
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-28 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="display-title max-w-4xl text-3xl text-muted-foreground sm:text-5xl">
            THE INTERNET LEARNED EVERYTHING ABOUT YOUR DIGITAL LIFE.
            <span className="text-foreground"> WHAT ABOUT THE REST OF IT?</span>
          </p>
        </div>
      </section>

      <section className="fog-scene px-5 py-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Social Value"
            title={<>NOT FOLLOWERS. SOCIAL&nbsp;VALUE.</>}
            copy="What happens because people know you. Independent dimensions — Level, Heat, Circle, Bridge, and the ways you participate. Never one universal score."
          />
          <SocialProfile />
        </div>
      </section>

      <section className="px-5 py-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <CircleNetwork />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Circle"
              title="DON’T COLLECT FOLLOWERS. EXPAND YOUR CIRCLE."
              copy="Following shows you their world. Connecting expands yours. Circle measures reach and diversity — cities, communities and skill domains — not follower count."
            />
          </div>
        </div>
      </section>

      <section className="fog-scene px-5 py-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Bridge"
            title="YOU SHOULD MEET."
            copy="Bridge is the value of connecting otherwise separated but relevant people: distance × relevance × outcome."
          />
          <div className="glass-surface rounded-[2rem] p-7 sm:p-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-3xl">MAYA</p>
                <p className="mt-2 text-sm text-muted-foreground">Industrial Designer · London</p>
              </div>
              <StatusLabel demo>Bridge</StatusLabel>
            </div>
            <dl className="mt-9 grid gap-5 border-t border-border pt-7 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Mutual connections</dt>
                <dd className="mt-1 font-display text-2xl">0</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Bridge potential</dt>
                <dd className="mt-1 font-display text-2xl text-primary">91</dd>
              </div>
            </dl>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-primary">
              You should meet
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Today"
            title={
              <>
                IDee DOESN’T ASK YOU TO STAY.
                <br />
                IT TELLS YOU WHERE TO GO.
              </>
            }
            copy="One considered view of your day: people worth meeting, places worth going, and one clear action. Then it gets out of the way."
          />
          <TodayScreen />
        </div>
      </section>

      <section className="fog-scene px-5 py-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <LivingMap />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Living Map"
              title="THE WORLD IS THE INTERFACE."
              copy="A living view of what’s happening around you — culture, people, quests and moments worth leaving the house for."
            />
          </div>
        </div>
      </section>

      <section className="px-5 py-28 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Play"
            title="STOP SCROLLING THROUGH LIFE. START PLAYING IT."
            copy="XP, Credits, Heat, Achievements, Auras, Quests, Streaks and Drops — all earned by doing something real. Credits are reward value, not cryptocurrency."
          />
          <div className="mt-16 grid gap-x-10 gap-y-6 border-t border-border pt-10 sm:grid-cols-2">
            {participation.map(([action, reward]) => (
              <div key={action} className="flex items-center justify-between border-b border-border py-4">
                <span className="text-sm">{action}</span>
                <span className="text-xs font-bold uppercase text-primary">{reward}</span>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap items-center gap-3">
            {heatStates.map((state) => (
              <span
                key={state.name}
                className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold"
              >
                <span className="size-2.5 rounded-full" style={{ background: `var(--${state.tone})` }} />
                {state.name}
              </span>
            ))}
          </div>
          <Button className="mt-12" variant="glass" asChild>
            <Link to="/play">
              Explore Play Real Life <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </section>

      <section className="fog-scene px-5 py-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="IDee IRL · London"
              title="A CITY, PLAYED PROPERLY."
              copy="A concept for the first IDee IRL experience: introductions worth making, culture worth seeing, Bump connections, quests and causes across one city."
            />
            <div className="mt-10 flex flex-wrap gap-3">
              <StatusLabel>Concept</StatusLabel>
              <StatusLabel demo>Illustrative metrics</StatusLabel>
            </div>
          </div>
          <figure className="overflow-hidden rounded-[2rem] shadow-depth">
            <img
              src={londonImage}
              alt="Atmospheric evening view of London used to illustrate the IDee IRL concept"
              width={1024}
              height={1024}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </figure>
        </div>
      </section>

      <section className="px-5 py-28 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            align="center"
            eyebrow="Device"
            title="PHONE FIRST. THEN SOMETHING YOU WEAR."
            copy="IDee begins as an app. The concept continues as a quiet, contextual object: dormant fog, a mint perimeter response, identity emerging from inside the glass."
          />
          <DeviceConceptFrame />
          <div className="flex justify-center">
            <Button variant="glass" asChild>
              <Link to="/device">
                See the device concept <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="fog-scene px-5 py-28 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow="Trust"
            title="PRESENCE IS A PRIVILEGE, NOT A DEFAULT."
            copy="Follow, Connect and Trusted Relationship are three different things. Following never reveals location, presence or private information — and never bypasses minor safety."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Follow", "One-way interest in someone’s public world."],
              ["Connect", "A mutual relationship that can expand both Circles."],
              ["Trusted", "Explicit, revocable, and required for anything sensitive."],
            ].map(([title, copy]) => (
              <div key={title} className="glass-surface rounded-2xl p-6">
                <p className="font-display text-xl">{title}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="early-access" className="px-5 pb-32 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="Early access"
            title="GO BECOME SOMEBODY."
            copy="Join the early access list. We’ll share meaningful progress — not noise."
          />
          <EarlyAccessForm />
        </div>
      </section>
    </PublicShell>
  );
}
