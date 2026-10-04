"use client";

import { AlertTriangle, RefreshCw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardHeader, DashboardIntro } from "@/components/dashboard/dashboard-header";
import { OverviewView } from "@/components/dashboard/overview-view";
import { PipelineDrawer } from "@/components/dashboard/pipeline-drawer";
import { PipelinesView } from "@/components/dashboard/pipelines-view";
import { ProjectsView } from "@/components/dashboard/projects-view";
import { RunnersView } from "@/components/dashboard/runners-view";
import type { View } from "@/components/dashboard/types";
import { Alert } from "@/components/ui/alert";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { usePipelineDetail } from "@/hooks/use-pipeline-detail";

export function DashboardShell() {
  const [view, setView] = useState<View>("overview");
  const [project, setProject] = useState("all");
  const { data, loading, error, lastRefresh, loadData } = useDashboardData(project);
  const pipeline = usePipelineDetail();

  const selectedProjectName = useMemo(() => data?.projects.find((item) => String(item.id) === project)?.name, [data, project]);
  const title = view === "overview" ? "Delivery overview" : view === "pipelines" ? "Pipeline operations" : view === "projects" ? "Project inventory" : "Runner fleet";

  return <main className="ops-shell">
    <DashboardHeader loading={loading} onRefresh={() => void loadData()} />
    <DashboardIntro title={title} projectName={selectedProjectName || "All visible projects"} lastRefresh={lastRefresh} />
    <DashboardFilters view={view} project={project} projects={data?.projects || []} onViewChange={setView} onProjectChange={setProject} />
    <section className="page-width dashboard-content">
      {error ? <Alert tone="danger"><XCircle size={17} /><div><strong>Unable to refresh dashboard</strong><span>{error}</span></div></Alert> : null}
      {data?.warnings.map((warning) => <Alert key={warning} tone={warning.toLowerCase().includes("unavailable") ? "warning" : "info"}><AlertTriangle size={17} /><span>{warning}</span></Alert>)}
      {loading && !data ? <div className="loading-panel"><RefreshCw className="spin" size={24} /><span>Reading GitLab telemetry...</span></div> : data && view === "overview" ? <OverviewView data={data} onViewPipelines={() => setView("pipelines")} onSelectPipeline={pipeline.openPipeline} /> : data && view === "pipelines" ? <PipelinesView data={data} onSelectPipeline={pipeline.openPipeline} /> : data && view === "projects" ? <ProjectsView data={data} /> : data ? <RunnersView data={data} /> : null}
    </section>
    {pipeline.selectedPipeline ? <PipelineDrawer pipeline={pipeline.selectedPipeline} detail={pipeline.pipelineDetail} loading={pipeline.loading} error={pipeline.error} onClose={pipeline.closePipeline} /> : null}
    <footer className="page-width ops-footer"><span>Source: GitLab API</span><span>Server-side token · no GitLab credentials in the browser</span></footer>
  </main>;
}
