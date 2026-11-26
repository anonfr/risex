import { ProjectsClient } from "@/components/ProjectsClient";
import { BuilderEntry, CompetitionEntry, riseFetch } from "@/lib/risex";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [buildersRes, competitionsRes] = await Promise.allSettled([
    riseFetch<{ data: { builders: BuilderEntry[] } }>("/v1/builders", 60),
    riseFetch<{ data: { competitions: CompetitionEntry[] } }>("/v1/competitions", 60),
  ]);

  const builders =
    buildersRes.status === "fulfilled" ? buildersRes.value.data?.builders || [] : [];
  const competitions =
    competitionsRes.status === "fulfilled"
      ? competitionsRes.value.data?.competitions || []
      : [];

  return <ProjectsClient builders={builders} competitions={competitions} />;
}
