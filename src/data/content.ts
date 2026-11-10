import { DEMO_MODE } from "@/config/site";

export const demoLabel = DEMO_MODE ? "Demo" : undefined;

export const dimensions = ["Connector", "Explorer", "Builder", "Culture", "Knowledge", "Community", "Impact"];

export const heatStates = [
  { name: "Ambient", tone: "heat-ambient" },
  { name: "Active", tone: "heat-active" },
  { name: "Moving", tone: "heat-moving" },
  { name: "Hot", tone: "heat-hot" },
  { name: "Heater", tone: "heat-heater" },
  { name: "On Fire", tone: "heat-fire" },
] as const;

export const participation = [
  ["Visit a gallery", "+100 Credits"],
  ["Try an off-peak table", "+200 Credits"],
  ["Complete an event Quest", "Achievement"],
  ["Introduce two relevant people", "Connector Credits"],
  ["Explore a new neighborhood", "XP"],
  ["Join a charitable activity", "Impact"],
] as const;

export const audiences = [
  { value: "consumer", label: "Consumer", prompt: "Be first to experience IDee." },
  { value: "founders", label: "Founders Edition", prompt: "Register interest in the first 1,000 future production devices." },
  { value: "business", label: "Business", prompt: "Explore verified real-world action." },
  { value: "events", label: "Events & venues", prompt: "Bring a living World to your place or event." },
  { value: "creator", label: "Creator", prompt: "Explore future creator tools and experiences." },
  { value: "partner", label: "Strategic partner", prompt: "Start a considered partnership conversation." },
] as const;

export type Audience = (typeof audiences)[number]["value"];