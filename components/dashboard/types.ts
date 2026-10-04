import type { LucideIcon } from "lucide-react";

import { Activity, Layers3, ListChecks, Server } from "lucide-react";

export type View = "overview" | "pipelines" | "projects" | "runners";

export const views: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "pipelines", label: "Pipelines", icon: ListChecks },
  { id: "projects", label: "Projects", icon: Layers3 },
  { id: "runners", label: "Runners", icon: Server },
];
