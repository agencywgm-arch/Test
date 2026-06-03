import { getProspect } from "@/lib/prospecting-actions";
import ProspectDetail from "@/components/ProspectDetail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProspectPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    const prospect = await getProspect(params.id);
    return <ProspectDetail prospect={prospect} />;
  } catch {
    notFound();
  }
}
