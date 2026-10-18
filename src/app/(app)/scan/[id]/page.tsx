import { ResultsView } from "@/components/scan/results-view";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultsView id={id} />;
}
