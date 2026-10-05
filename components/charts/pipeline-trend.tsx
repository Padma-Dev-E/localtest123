"use client";

import type { PipelineSummary, PipelineTrendPoint } from "@/lib/dashboard";
import { EChart } from "./echart";

export function PipelineTrend({ pipelines, trend }: { pipelines: PipelineSummary[]; trend?: PipelineTrendPoint[] }) {
  const days = new Map<string, { total: number; successful: number; failed: number }>();
  if (trend?.length) trend.forEach((point) => days.set(point.bucket, point));
  else for (const pipeline of pipelines) {
    const date = new Date(pipeline.createdAt);
    date.setMinutes(0, 0, 0);
    const hour = Number.isNaN(date.getTime()) ? pipeline.createdAt : date.toISOString();
    const current = days.get(hour) || { total: 0, successful: 0, failed: 0 };
    current.total += 1;
    if (pipeline.status === "success") current.successful += 1;
    if (pipeline.status === "failed") current.failed += 1;
    days.set(hour, current);
  }
  const labels = [...days.keys()].sort();
  const displayLabels = labels.map((hour) => {
    const date = new Date(hour);
    if (Number.isNaN(date.getTime())) return hour;
    return trend?.length ? date.toLocaleDateString([], { month: "short", day: "numeric" }) : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });
  return <EChart ariaLabel="Pipeline volume and outcome trend" option={{
    animation: false,
    color: ["#0f766e", "#dc2626", "#64748b"],
    grid: { top: 20, right: 18, bottom: 26, left: 38 },
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, icon: "roundRect", itemWidth: 9, itemHeight: 9, textStyle: { color: "#64748b" } },
    xAxis: { type: "category", data: displayLabels, boundaryGap: false, axisLine: { lineStyle: { color: "#e2e8f0" } }, axisLabel: { color: "#64748b" } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#f1f5f9" } }, axisLabel: { color: "#64748b" } },
    series: [
      { name: "Total", type: "line", smooth: true, symbol: "none", data: labels.map((day) => days.get(day)?.total || 0) },
      { name: "Success", type: "line", smooth: true, symbol: "none", data: labels.map((day) => days.get(day)?.successful || 0) },
      { name: "Failed", type: "line", smooth: true, symbol: "none", data: labels.map((day) => days.get(day)?.failed || 0) },
    ],
  }} />;
}
