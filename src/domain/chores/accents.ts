export const CHORE_ACCENT_KEYS = [
  "rose",
  "sky",
  "amber",
  "lavender",
  "mint",
  "peach",
  "teal",
] as const;

export type ChoreAccentKey = (typeof CHORE_ACCENT_KEYS)[number];

export const CHORE_ACCENTS: ReadonlyArray<{
  key: ChoreAccentKey;
  label: string;
  cssVariable: string;
}> = [
  { key: "rose", label: "Rose", cssVariable: "--color-rose" },
  { key: "sky", label: "Sky", cssVariable: "--color-sky" },
  { key: "amber", label: "Amber", cssVariable: "--color-amber" },
  { key: "lavender", label: "Lavender", cssVariable: "--color-lavender" },
  { key: "mint", label: "Mint", cssVariable: "--color-mint" },
  { key: "peach", label: "Peach", cssVariable: "--color-peach" },
  { key: "teal", label: "Teal", cssVariable: "--color-teal" },
];

export function getChoreAccent(key: string) {
  return CHORE_ACCENTS.find((accent) => accent.key === key) ?? CHORE_ACCENTS[4]!;
}
