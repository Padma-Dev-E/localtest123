import { AlertTriangle, ArrowUpRight, Clock3 } from "lucide-react";

import { formatDate, EmptyState, StatusBadge } from "@/components/dashboard/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineSummary } from "@/lib/dashboard";

export function ActionRequiredWidget({ pipelines }: { pipelines: PipelineSummary[] }) {
  const now = Date.now();
  const items = [...pipelines].filter((pipeline) => pipeline.status === "failed" || (["running", "pending", "created"].includes(pipeline.status) && now - Date.parse(pipeline.updatedAt) > 60 * 60 * 1000)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 6);
  return <Card><CardHeader><CardTitle><AlertTriangle size={16} />Action required</CardTitle><CardDescription>Failed pipelines and runs active for more than one hour</CardDescription></CardHeader><CardContent>{items.length ? <div className="widget-list">{items.map((pipeline) => <div className="widget-row" key={`${pipeline.projectId}-${pipeline.id}`}><div className="widget-row-copy"><strong>{pipeline.projectName.split("/").slice(-1)[0]}</strong><span>{pipeline.ref} · {formatDate(pipeline.updatedAt)}</span></div><span className="widget-row-actions"><StatusBadge status={pipeline.status} /><a className="icon-link" href={pipeline.webUrl} target="_blank" rel="noreferrer" title="Open pipeline"><ArrowUpRight size={15} /></a></span></div>)}</div> : <EmptyState icon={<Clock3 size={22} />} title="Nothing needs attention" detail="No failed or unusually long-running pipelines are visible in this window." />}</CardContent></Card>;
}
