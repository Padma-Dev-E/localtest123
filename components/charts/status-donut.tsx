"use client";

import type { PipelineSummary } from "@/lib/dashboard";
import { EChart } from "./echart";

export function StatusDonut({ pipelines }: { pipelines: PipelineSummary[] }) {
  const counts = new Map<string, number>();
  for (const pipeline of pipelines) counts.set(pipeline.status, (counts.get(pipeline.status) || 0) + 1);
  const data = [...counts.entries()].map(([name, value]) => ({ name, value }));
  return <EChart ariaLabel="Pipeline status distribution" option={{
    animation: false,
    color: ["#0f766e", "#dc2626", "#d97706", "#64748b", "#2563eb", "#94a3b8"],
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, type: "scroll", textStyle: { color: "#64748b" } },
    series: [{ type: "pie", radius: ["52%", "74%"], center: ["50%", "42%"], avoidLabelOverlap: true, label: { show: false }, data }],
  }} height={260} />;
}
