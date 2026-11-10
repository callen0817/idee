import { AmbientField } from "@/components/brand/ambient-field";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PublicShell({ children, footer = true }: { children: React.ReactNode; footer?: boolean }) {
  return <><AmbientField /><SiteHeader /><main>{children}</main>{footer && <SiteFooter />}</>;
}