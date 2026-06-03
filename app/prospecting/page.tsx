import { getProspects, getProspectingStats } from "@/lib/prospecting-actions";
import ProspectingDashboard from "@/components/ProspectingDashboard";

export const dynamic = "force-dynamic";

export default async function ProspectingPage() {
  const [prospects, stats] = await Promise.all([
    getProspects(),
    getProspectingStats(),
  ]);

  return <ProspectingDashboard prospects={prospects} stats={stats} />;
}
