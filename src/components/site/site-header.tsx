import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass-surface mx-auto flex h-14 max-w-[1480px] items-center justify-between rounded-full px-4 sm:px-5">
        <Link to="/" aria-label="IDee home"><BrandMark /></Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-5 xl:flex">
          {siteConfig.nav.slice(1).map((item) => <Link key={item.to} to={item.to} className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>{item.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? <><Button variant="ghost" size="sm" asChild><Link to="/my"><UserRound />My IDee</Link></Button><Button variant="glass" size="sm" onClick={signOut}>Sign out</Button></> : <Button variant="ghost" size="sm" asChild><Link to="/sign-in">Sign in</Link></Button>}
          <Button size="sm" asChild><Link to="/early-access">Get early access</Link></Button>
        </div>
        <Sheet>
          <SheetTrigger asChild><Button variant="glass" size="icon" className="md:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
          <SheetContent side="right" className="w-[92%] border-border bg-background/95 p-7 backdrop-blur-3xl">
            <SheetTitle><BrandMark /></SheetTitle><SheetDescription>Interactive Digital Encounter Engine</SheetDescription>
            <nav className="mt-14 flex flex-col gap-1" aria-label="Mobile navigation">
              {siteConfig.nav.map((item) => <SheetClose key={item.to} asChild><Link to={item.to} className="border-b border-border py-4 font-display text-2xl">{item.label}</Link></SheetClose>)}
            </nav>
            <div className="mt-8 grid gap-3"><Button variant="glass" asChild><Link to={user ? "/my" : "/sign-in"}>{user ? "My IDee" : "Sign in"}</Link></Button><Button asChild><Link to="/early-access">Get early access</Link></Button></div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}