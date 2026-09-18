import { WandSparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";

export default function AddChorePage() {
  return (
    <PageShell title="Add a Chore" variant="detail" backHref="/chores">
      <PlaceholderCard
        icon={WandSparkles}
        title="The form comes next"
        description="This route proves the shared detail header and navigation without implementing chore data early."
        accent="peach"
      />
    </PageShell>
  );
}
