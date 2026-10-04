"use client";

import type { PipelineSummary } from "@/lib/dashboard";
import { calculateDurationSeconds } from "@/lib/dashboard";
import { EChart } from "./echart";

export function DurationBar({ pipelines }: { pipelines: PipelineSummary[] }) {
  const durations = new Map<string, number[]>();
  for (const pipeline of pipelines) {
    const values = durations.get(pipeline.projectName) || [];
    values.push(calculateDurationSeconds(pipeline));
    durations.set(pipeline.projectName, values);
  }
  const entries = [...durations.entries()].map(([name, values]) => ({ name, value: Math.round(values.reduce((a, b) => a + b, 0) / values.length) })).sort((a, b) => b.value - a.value).slice(0, 8);
  return <EChart ariaLabel="Average pipeline duration by project" option={{
    animation: false,
    color: ["#0f766e"],
    grid: { top: 10, right: 18, bottom: 42, left: 150 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (value) => `${value}s` },
    xAxis: { type: "value", splitLine: { lineStyle: { color: "#f1f5f9" } }, axisLabel: { color: "#64748b" } },
    yAxis: { type: "category", data: entries.map((entry) => entry.name.split("/").slice(-2).join("/")), axisLabel: { color: "#64748b", width: 135, overflow: "truncate" } },
    series: [{ type: "bar", barMaxWidth: 18, data: entries.map((entry) => entry.value) }],
  }} height={260} />;
}
