import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { SuggestionPreview } from "@/components/suggestions/SuggestionPreview";
import { getSuggestionPreset } from "@/data/suggestions/catalog";

export default async function SuggestionPreviewPage({ params }: PageProps<"/chores/suggestions/[id]">) {
  const { id } = await params;
  const preset = getSuggestionPreset(id);
  if (!preset) notFound();
  return <PageShell title={preset.name} variant="detail" backHref="/chores/suggestions">
    <SuggestionPreview preset={preset} />
  </PageShell>;
}
