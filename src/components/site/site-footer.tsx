import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand/brand-mark";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return <footer className="border-t border-border px-5 py-10"><div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><BrandMark /><p className="mt-3 max-w-sm text-sm text-muted-foreground">An operating system for participating in real life.</p><p className="mt-8 text-xs text-muted-foreground">© 2026 IDee. Product concepts are in development.</p></div><nav aria-label="Footer navigation" className="flex max-w-xl flex-wrap gap-x-5 gap-y-3">{siteConfig.nav.map((item) => <Link key={item.to} to={item.to} className="text-xs font-semibold text-muted-foreground hover:text-foreground">{item.label}</Link>)}<Link to="/trust" className="text-xs font-semibold text-muted-foreground hover:text-foreground">Trust</Link><Link to="/access" className="text-xs font-semibold text-muted-foreground hover:text-foreground">Access</Link></nav></div></footer>;
}