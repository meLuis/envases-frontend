import { AlgoDetail } from "@/components/AlgoDetail";

export default async function AlgoPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;
  return <AlgoDetail datasetId={id} slug={slug} />;
}
