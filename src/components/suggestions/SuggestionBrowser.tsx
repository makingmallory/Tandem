"use client";

import Link from "next/link";
import { useState } from "react";
import { ChoreIcon } from "@/components/chore/ChoreIcon";
import type { SuggestionCollection, SuggestionPreset } from "@/data/suggestions/catalog";

export function SuggestionBrowser({ presets, collections }: Readonly<{ presets: readonly SuggestionPreset[]; collections: readonly SuggestionCollection[] }>) {
  const [collection, setCollection] = useState<SuggestionCollection | "All">("All");
  const visible = collection === "All" ? presets : presets.filter((preset) => preset.collection === collection);
  return <div className="page-stack suggestion-browser">
    <p className="section-supporting-copy">Useful starting points for your home. Suggested schedules are starting points — adjust them to fit your home.</p>
    <div className="suggestion-chips" aria-label="Suggestion collections">
      {(["All", ...collections] as const).map((item) => <button key={item} type="button" className="suggestion-chip" aria-pressed={collection === item}
        onClick={() => setCollection(item)}>{item}</button>)}
    </div>
    <ul className="suggestion-list" aria-label="Suggestions">
      {visible.map((preset) => <li key={preset.id}><Link className="suggestion-card" href={`/chores/suggestions/${preset.id}`}>
        <ChoreIcon iconKey={preset.iconKey} accentKey={preset.accentKey} />
        <span className="suggestion-card__body"><span className="suggestion-card__name">{preset.name}</span>
          <span className="suggestion-card__meta">{preset.kind === "category" ? "Category" : "Chore"} · {preset.schedule.label}</span>
          <span className="suggestion-card__meta">{preset.subtasks?.length ? `${preset.subtasks.length} subtasks` : null}{preset.subtasks?.length && preset.variants?.length ? " · " : null}{preset.variants?.length ? `${preset.variants.length} variants` : null}</span>
        </span>
      </Link></li>)}
    </ul>
  </div>;
}
