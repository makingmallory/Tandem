import { PageShell } from "@/components/layout/PageShell";
import { SuggestionBrowser } from "@/components/suggestions/SuggestionBrowser";
import { SUGGESTION_COLLECTIONS, SUGGESTION_PRESETS } from "@/data/suggestions/catalog";

export default function SuggestionsPage() {
  return <PageShell title="Suggestions" variant="detail" backHref="/chores/new">
    <SuggestionBrowser presets={SUGGESTION_PRESETS} collections={SUGGESTION_COLLECTIONS} />
  </PageShell>;
}
