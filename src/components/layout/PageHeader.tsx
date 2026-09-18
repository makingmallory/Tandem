import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export type PageHeaderProps = {
  title: string;
  variant: "root" | "detail";
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  variant,
  subtitle,
  backHref,
  actions,
}: Readonly<PageHeaderProps>) {
  const isDetail = variant === "detail";

  if (isDetail && !backHref) {
    throw new Error("Detail page headers require a backHref.");
  }

  return (
    <header
      className={`page-header page-header--${variant}`}
      data-testid="page-header"
      data-variant={variant}
    >
      {isDetail ? (
        <div className="page-header__slot">
          <Link className="icon-button" href={backHref!} aria-label="Go back">
            <ArrowLeft aria-hidden="true" size={21} strokeWidth={2.25} />
          </Link>
        </div>
      ) : null}

      <div className="page-header__title-group">
        <h1 className="page-header__title" data-testid="page-header-title">
          {title}
        </h1>
        {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
      </div>

      <div className="page-header__slot">{actions}</div>
    </header>
  );
}
