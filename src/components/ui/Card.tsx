type CardProps = {
  children: React.ReactNode;
  className?: string;
  tinted?: boolean;
};

export function Card({ children, className = "", tinted = false }: Readonly<CardProps>) {
  return <section className={`card${tinted ? " card--tinted" : ""} ${className}`.trim()}>{children}</section>;
}
