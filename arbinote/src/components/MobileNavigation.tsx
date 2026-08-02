"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/lib/i18n";

export default function MobileNavigation() {
  const { t } = useTranslations();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/mes-votes") {
      return pathname === "/mes-votes";
    }
    if (path === "/") {
      return pathname === "/" || pathname.startsWith("/matches/");
    }
    if (path === "/classement") {
      return pathname === "/classement" || pathname.startsWith("/classement/");
    }
    return false;
  };

  const navItems = [
    {
      href: "/mes-votes",
      label: t("nav.myVotes"),
      icon: <i className="fa-regular fa-rectangle-list text-xl"></i>,
    },
    {
      href: "/",
      label: t("nav.matches"),
      icon: <i className="fa-solid fa-futbol text-xl"></i>,
    },
    {
      href: "/classement",
      label: t("nav.rankings"),
      icon: <i className="fa-solid fa-ranking-star text-xl"></i>,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item, index) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors px-1 ${
                active ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <div className={`flex-shrink-0 ${active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500"}`}>{item.icon}</div>
              <span className="text-[10px] font-medium text-center leading-tight whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
