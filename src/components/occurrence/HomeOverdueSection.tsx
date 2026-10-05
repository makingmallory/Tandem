"use client";

import { useState } from "react";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import type { OccurrenceWithChore } from "@/data/occurrences/types";
import type { DateOnly } from "@/domain/dates/date-only";
import { homeOverduePresentation } from "@/domain/occurrences/home-overdue";

type HomeOverdueSectionProps = {
  occurrences: OccurrenceWithChore[];
  today: DateOnly;
};

export function HomeOverdueSection({ occurrences, today }: Readonly<HomeOverdueSectionProps>) {
  const [showOlder, setShowOlder] = useState(false);
  const overdue = homeOverduePresentation(occurrences, today);
  const displayed = showOlder ? [...overdue.visible, ...overdue.older] : overdue.visible;

  if (!overdue.total) return null;

  return (
    <section className="section-stack" aria-labelledby="overdue-heading">
      <h2 className="section-heading" id="overdue-heading">Needs a little catch-up</h2>
      <ul className="occurrence-list">
        {displayed.map((occurrence) => (
          <OccurrenceCard occurrence={occurrence} today={today} showDate presentation="home" key={occurrence.id} />
        ))}
      </ul>
      {overdue.older.length ? (
        <button
          className="app-button app-button--tertiary home-overdue-toggle"
          type="button"
          onClick={() => setShowOlder((current) => !current)}
        >
          {showOlder ? "Show less" : `Show more (${overdue.older.length})`}
        </button>
      ) : null}
    </section>
  );
}
