import Link from "next/link";
import { ChoreIcon } from "@/components/chore/ChoreIcon";
import { Card } from "@/components/ui/Card";
import type { SuggestionPreset } from "@/data/suggestions/catalog";

export function SuggestionPreview({ preset }: Readonly<{ preset: SuggestionPreset }>) {
  return <div className="page-stack suggestion-preview">
    <Card><div className="suggestion-preview__heading"><ChoreIcon iconKey={preset.iconKey} accentKey={preset.accentKey} />
      <div><p className="eyebrow">{preset.kind === "category" ? "Category suggestion" : "Chore suggestion"}</p><p>{preset.description}</p><p className="muted-copy">{preset.schedule.label}</p></div></div></Card>
    {preset.roomHint ? <Card><h2 className="section-heading">Room hint</h2><p className="muted-copy">{preset.roomHint}. Choose any applicable household Rooms in the next step.</p></Card> : null}
    {preset.subtasks?.length ? <Card><h2 className="section-heading">Subtasks</h2><ul className="suggestion-preview__list">{preset.subtasks.map((step) => <li key={step}>{step}</li>)}</ul></Card> : null}
    {preset.variants?.length ? <Card><h2 className="section-heading">Variants</h2><ul className="suggestion-preview__list">{preset.variants.map((variant) => <li key={variant}>{variant}</li>)}</ul></Card> : null}
    <Link className="app-button" href={`/chores/new?suggestion=${preset.id}`}>Use this suggestion</Link>
  </div>;
}
