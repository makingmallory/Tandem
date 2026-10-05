"use client";

import { Settings2 } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { APP_BRAND } from "@/config/brand";
import { useAppChrome } from "@/components/layout/AppChromeContext";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";
import { IconButton } from "@/components/ui/IconButton";

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
  const pathname = usePathname();
  const { authenticated } = useAppChrome();
  const defaultSettingsAction = authenticated && !isDetail && pathname !== "/household" ? (
    <IconButton href="/household" label="Open settings">
      <Settings2 aria-hidden="true" size={21} strokeWidth={2.2} />
    </IconButton>
  ) : null;

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
          <HeaderBackButton fallbackHref={backHref!} />
        </div>
      ) : null}

      <div className="page-header__title-group">
        {!isDetail && authenticated ? (
          <div className="page-header__brand" aria-label={APP_BRAND.name}>
            <Image className="page-header__logo" src={APP_BRAND.iconPath} alt="" width={36} height={36} priority />
            <span className="page-header__brand-name">{APP_BRAND.name}</span>
          </div>
        ) : null}
        <div className="page-header__title-copy">
          <h1 className="page-header__title" data-testid="page-header-title">
            {title}
          </h1>
          {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="page-header__slot">
        <div className="page-header__actions">
          {actions}
          {defaultSettingsAction}
        </div>
      </div>
    </header>
  );
}
