import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GitCommitHorizontal,
  GitMerge,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ActivityItem } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds < 1) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

export function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusTone(status: string): "neutral" | "success" | "danger" | "warning" | "info" {
  if (status === "success") return "success";
  if (["failed", "canceled"].includes(status)) return "danger";
  if (["running", "pending", "created", "waiting_for_resource"].includes(status)) return "warning";
  if (status === "skipped") return "info";
  return "neutral";
}

export function StatusBadge({ status }: { status: string }) {
  const Icon = status === "success" ? CheckCircle2 : status === "failed" ? XCircle : status === "running" ? Activity : Clock3;
  return <Badge tone={statusTone(status)} className="status-badge"><Icon size={13} aria-hidden="true" />{status.replaceAll("_", " ")}</Badge>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "teal" }: { label: string; value: string | number; detail: string; icon: typeof Activity; tone?: "teal" | "rose" | "amber" | "blue" }) {
  return <Card className="metric-card"><CardContent><div className={cn("metric-icon", `metric-icon-${tone}`)}><Icon size={17} aria-hidden="true" /></div><div className="metric-copy"><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-detail">{detail}</span></div></CardContent></Card>;
}

export function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "merge_request") return <GitMerge size={16} aria-hidden="true" />;
  if (kind === "issue") return <TriangleAlert size={16} aria-hidden="true" />;
  return <GitCommitHorizontal size={16} aria-hidden="true" />;
}

export function EmptyState({ title, detail, icon = <AlertTriangle size={22} /> }: { title: string; detail: string; icon?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{detail}</p></div>;
}
