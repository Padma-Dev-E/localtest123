import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Alert({ className, tone = "warning", ...props }: HTMLAttributes<HTMLDivElement> & { tone?: "warning" | "danger" | "info" }) {
  return <div role="status" className={cn("ui-alert", `ui-alert-${tone}`, className)} {...props} />;
}
