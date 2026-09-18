import Link from "next/link";

type IconButtonProps = {
  href: string;
  label: string;
  children: React.ReactNode;
};

export function IconButton({ href, label, children }: Readonly<IconButtonProps>) {
  return (
    <Link className="icon-button" href={href} aria-label={label}>
      {children}
    </Link>
  );
}
