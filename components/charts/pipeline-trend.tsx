"use client";

import type { PipelineSummary } from "@/lib/dashboard";
import { EChart } from "./echart";

export function PipelineTrend({ pipelines }: { pipelines: PipelineSummary[] }) {
  const days = new Map<string, { total: number; successful: number; failed: number }>();
  for (const pipeline of pipelines) {
    const day = pipeline.createdAt.slice(0, 10);
    const current = days.get(day) || { total: 0, successful: 0, failed: 0 };
    current.total += 1;
    if (pipeline.status === "success") current.successful += 1;
    if (pipeline.status === "failed") current.failed += 1;
    days.set(day, current);
  }
  const labels = [...days.keys()].sort();
  return <EChart ariaLabel="Pipeline volume and outcome trend" option={{
    animation: false,
    color: ["#0f766e", "#dc2626", "#64748b"],
    grid: { top: 20, right: 18, bottom: 26, left: 38 },
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, icon: "roundRect", itemWidth: 9, itemHeight: 9, textStyle: { color: "#64748b" } },
    xAxis: { type: "category", data: labels, boundaryGap: false, axisLine: { lineStyle: { color: "#e2e8f0" } }, axisLabel: { color: "#64748b" } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#f1f5f9" } }, axisLabel: { color: "#64748b" } },
    series: [
      { name: "Total", type: "line", smooth: true, symbol: "none", data: labels.map((day) => days.get(day)?.total || 0) },
      { name: "Success", type: "line", smooth: true, symbol: "none", data: labels.map((day) => days.get(day)?.successful || 0) },
      { name: "Failed", type: "line", smooth: true, symbol: "none", data: labels.map((day) => days.get(day)?.failed || 0) },
    ],
  }} />;
}
