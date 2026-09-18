const AVATAR_ACCENTS = [
  "var(--color-rose)",
  "var(--color-sky)",
  "var(--color-amber)",
  "var(--color-lavender)",
  "var(--color-mint)",
] as const;

type AvatarProps = {
  name: string;
  accentIndex?: number;
};

export function Avatar({ name, accentIndex = 0 }: Readonly<AvatarProps>) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const accent = AVATAR_ACCENTS[accentIndex % AVATAR_ACCENTS.length];

  return (
    <span
      className="avatar"
      style={{ "--avatar-accent": accent } as React.CSSProperties}
      aria-label={name}
    >
      {initial}
    </span>
  );
}
