import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "danger" | "warning" | "info" }) {
  return <span className={cn("ui-badge", `ui-badge-${tone}`, className)} {...props} />;
}
