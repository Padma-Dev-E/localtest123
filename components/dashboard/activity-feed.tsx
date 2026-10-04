import { ActivityIcon, EmptyState, formatDate } from "@/components/dashboard/shared";
import type { ActivityItem } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  if (!activity.length) return <EmptyState title="No recent activity" detail="Merge requests, issues, and commits will appear here." />;
  return <div className="activity-feed">{activity.slice(0, 8).map((item, index) => <a className="activity-item" href={item.webUrl} target="_blank" rel="noreferrer" key={`${item.webUrl}-${index}`}><span className={cn("activity-icon", `activity-${item.kind}`)}><ActivityIcon kind={item.kind} /></span><span className="activity-copy"><strong>{item.title}</strong><span>{item.projectName} · {item.actor}</span></span><time>{formatDate(item.updatedAt)}</time></a>)}</div>;
}
