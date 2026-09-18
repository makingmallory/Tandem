import { Home } from "lucide-react";
import { Card } from "@/components/ui/Card";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: Readonly<EmptyStateProps>) {
  return (
    <Card className="state-card">
      <span className="state-card__icon">
        <Home aria-hidden="true" size={24} />
      </span>
      <h2 className="state-card__title">{title}</h2>
      <p className="state-card__copy">{description}</p>
    </Card>
  );
}
