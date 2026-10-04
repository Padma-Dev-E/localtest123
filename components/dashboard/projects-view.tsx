import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectTable } from "@/components/dashboard/project-table";
import type { DashboardData } from "@/lib/dashboard";

export function ProjectsView({ data }: { data: DashboardData }) {
  return <Card><CardHeader><CardTitle>Project inventory</CardTitle><CardDescription>Projects available to the configured read-only GitLab identity.</CardDescription></CardHeader><CardContent className="flush-content"><ProjectTable projects={data.projects} /></CardContent></Card>;
}
