import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/site/public-shell";
import { SectionHeading } from "@/components/brand/section-heading";
import { StatusLabel } from "@/components/brand/status-label";
import { Button } from "@/components/ui/button";
import { SocialProfile } from "@/components/product/social-profile";
import { participation } from "@/data/content";

export const Route = createFileRoute("/_authenticated/my")({
  head: () => ({
    meta: [
      { title: "My IDee" },
      { name: "description", content: "Your IDee — Circle, participation and invitations." },
      { property: "og:title", content: "My IDee" },
      { property: "og:description", content: "Your early-access account area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyPage,
});

function MyPage() {
  const { user } = Route.useRouteContext();

  return (
    <PublicShell>
      <section className="fog-scene px-5 pb-20 pt-32 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="fade-up">
            <StatusLabel>Early shell</StatusLabel>
            <h1 className="display-title mt-6 text-4xl sm:text-6xl">MY IDEE.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
              Signed in as {user.email}. Your Circle, Heat and participation history will live here as IDee
              opens in your city.
            </p>
          </div>
        </div>
      </section>
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <SocialProfile />
          <div>
            <SectionHeading eyebrow="When IDee opens" title="Ways to start earning" />
            <ul className="mt-10 grid gap-5">
              {participation.map(([action, reward]) => (
                <li key={action} className="flex items-baseline justify-between border-t border-border pt-4">
                  <span className="text-sm">{action}</span>
                  <span className="text-xs text-muted-foreground">{reward}</span>
                </li>
              ))}
            </ul>
            <Button variant="glass" className="mt-12" asChild>
              <Link to="/play">How playing real life works</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
