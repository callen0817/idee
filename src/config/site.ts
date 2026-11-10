export const DEMO_MODE = true;

export const siteConfig = {
  name: "IDee",
  fullName: "Interactive Digital Encounter Engine",
  status: "In development",
  nav: [
    { label: "IDee", to: "/" },
    { label: "World", to: "/world" },
    { label: "App", to: "/app" },
    { label: "Device", to: "/device" },
    { label: "Play", to: "/play" },
    { label: "Live", to: "/live" },
    { label: "For Business", to: "/business" },
    { label: "About", to: "/about" },
  ] as const,
};

export type PublicRoute = (typeof siteConfig.nav)[number]["to"];