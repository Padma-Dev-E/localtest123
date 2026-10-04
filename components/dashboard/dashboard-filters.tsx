import { Select } from "@/components/ui/select";
import { views, type View } from "@/components/dashboard/types";
import type { ProjectSummary } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function DashboardFilters({ view, project, projects, onViewChange, onProjectChange }: { view: View; project: string; projects: ProjectSummary[]; onViewChange: (view: View) => void; onProjectChange: (project: string) => void }) {
  return <section className="page-width control-row" aria-label="Dashboard filters"><div className="view-tabs">{views.map(({ id, label, icon: Icon }) => <button key={id} className={cn("view-tab", view === id && "view-tab-active")} onClick={() => onViewChange(id)}><Icon size={15} />{label}</button>)}</div><div className="filter-controls"><span className="window-summary">Last 24 hours</span><label>Project<Select value={project} onChange={(event) => onProjectChange(event.target.value)}><option value="all">All projects</option>{projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></label></div></section>;
}
