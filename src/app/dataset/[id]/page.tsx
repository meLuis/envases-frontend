import { Workspace } from "@/components/Workspace";

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Workspace datasetId={id} />;
}
