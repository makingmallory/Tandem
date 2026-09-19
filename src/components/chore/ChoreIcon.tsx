import type { CSSProperties } from "react";
import { getChoreAccent } from "@/domain/chores/accents";
import { getChoreIcon } from "@/domain/chores/icons";

type ChoreIconProps = {
  iconKey: string;
  accentKey: string;
  size?: "default" | "large";
};

type AccentStyle = CSSProperties & { "--chore-accent": string };

export function ChoreIcon({ iconKey, accentKey, size = "default" }: Readonly<ChoreIconProps>) {
  const { icon: Icon, label } = getChoreIcon(iconKey);
  const accent = getChoreAccent(accentKey);
  const style: AccentStyle = { "--chore-accent": `var(${accent.cssVariable})` };

  return (
    <span
      className={`chore-icon${size === "large" ? " chore-icon--large" : ""}`}
      style={style}
      role="img"
      aria-label={label}
    >
      <Icon aria-hidden="true" size={size === "large" ? 32 : 24} strokeWidth={2.1} />
    </span>
  );
}
