import { CalendarDays, GitBranch, RefreshCw, ShieldAlert } from "lucide-react";

import { formatDate } from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DashboardHeader({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return <header className="ops-header page-width"><div className="brand-lockup"><div className="brand-mark"><GitBranch size={23} aria-hidden="true" /></div><div><p className="eyebrow">Engineering control room</p><h1>GitLab Operations</h1></div></div><div className="header-actions"><Badge tone="info"><ShieldAlert size={13} /> Read-only access</Badge><Badge tone="warning">Temporary public surface</Badge><Button variant="outline" size="icon" onClick={onRefresh} disabled={loading} title="Refresh data" aria-label="Refresh data"><RefreshCw size={17} className={loading ? "spin" : ""} /></Button></div></header>;
}

export function DashboardIntro({ title, projectName, lastRefresh, windowLabel }: { title: string; projectName: string; lastRefresh: string | null; windowLabel: string }) {
  return <section className="page-width intro-row"><div><p className="section-kicker">{projectName}</p><h2>{title}</h2><p className="section-description">Read-only pipeline intelligence for projects, outcomes, failed jobs, and runners from {windowLabel.toLowerCase()}.</p></div><div className="refresh-meta"><CalendarDays size={15} />{lastRefresh ? `Updated ${formatDate(lastRefresh)}` : "Waiting for data"}</div></section>;
}
