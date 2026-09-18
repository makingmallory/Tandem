"use client";

import { CalendarDays, CheckSquare2, History, House, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isAdd?: boolean;
};

const NAV_ITEMS: readonly NavigationItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/chores/new", label: "Add", icon: Plus, isAdd: true },
  { href: "/chores", label: "Chores", icon: CheckSquare2 },
  { href: "/history", label: "History", icon: History },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  if (href === "/chores") return pathname === href || (pathname.startsWith("/chores/") && pathname !== "/chores/new");
  return pathname === href;
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {NAV_ITEMS.map(({ href, label, icon: Icon, ...item }) => {
        const isActive = isActivePath(pathname, href);
        const className = item.isAdd
          ? "bottom-nav__item bottom-nav__item--add"
          : "bottom-nav__item";

        return (
          <Link key={href} className={className} href={href} aria-current={isActive ? "page" : undefined}>
            {item.isAdd ? (
              <span className="bottom-nav__add-icon">
                <Icon aria-hidden="true" size={24} strokeWidth={2.5} />
              </span>
            ) : (
              <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.5 : 2} />
            )}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
