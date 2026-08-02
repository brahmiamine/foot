"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations, Locale } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import FederationSwitcher from "./FederationSwitcher";
import { useFederationContext } from "./FederationContext";
import { getLocalizedName } from "@/lib/utils";
import { isNextImageSafe } from "@/lib/imageHost";

const languages: { code: Locale; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

export default function Navigation() {
  const { t, locale, switchLocale } = useTranslations();
  const { federations, activeLeagueId, switchLeague } = useFederationContext();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Fermer le sidebar quand on change de page
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Empêcher le scroll du body quand le sidebar est ouvert
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Fermer le dropdown mobile avec Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  // Active league pour le dropdown
  const activeLeague = federations.flatMap((fed) => fed.leagues).find((league) => league.id === activeLeagueId);

  const activeLeagueLabel = activeLeague
    ? getLocalizedName(locale, {
        defaultValue: activeLeague.nom,
        fr: activeLeague.nom,
        en: activeLeague.nom_en ?? activeLeague.nom,
        ar: activeLeague.nom_ar ?? activeLeague.nom,
      })
    : t("federationSwitcher.noSelection");

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("arbinote-theme") as "light" | "dark" | null;
    return stored ?? "light";
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("arbinote-theme", nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }
  };

  const navLinks = [
    { href: "/", label: t("nav.matches"), icon: "fa-solid fa-futbol" },
    { href: "/matches", label: t("nav.allMatches"), icon: "fa-solid fa-magnifying-glass" },
    { href: "/classement", label: t("nav.rankings"), icon: "fa-solid fa-ranking-star" },
    { href: "/arbitres", label: t("nav.arbitres"), icon: "fa-solid fa-user-tie" },
    { href: "/teams", label: t("nav.teams"), icon: "fa-solid fa-shield-halved" },
    { href: "/mes-votes", label: t("nav.myVotes"), icon: "fa-regular fa-rectangle-list" },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="w-full max-w-full px-2 sm:px-4">
          {/* Mobile Header */}
          <div className="flex md:hidden items-center h-14 relative">
            {/* Hamburger Menu à gauche */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
              aria-label="Open menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo au centre (flex-1 pour prendre l'espace restant) */}
            <Link href="/" className="flex-1 flex justify-center items-center h-full">
              <Image src="/logo-light.png" alt="ARBINOTE" width={160} height={40} className="h-8 w-auto dark:hidden object-contain" priority />
              <Image src="/logo-dark.png" alt="ARBINOTE" width={160} height={40} className="h-8 w-auto hidden dark:block object-contain" priority />
            </Link>

            {/* Dropdown menu à droite */}
            <div className="relative shrink-0 z-[100]" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen((prev) => !prev);
                }}
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative z-[100]"
                aria-label="Options menu"
                aria-expanded={mobileMenuOpen}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown Content */}
              {mobileMenuOpen && (
                <>
                  {/* Overlay invisible pour fermer le menu */}
                  <div className="fixed inset-0 z-[75] bg-black/20" onClick={() => setMobileMenuOpen(false)} />
                  <div
                    className="fixed right-2 top-[3.5rem] w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-[80] max-h-[calc(100vh-4rem)] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Logos Section */}
                    {(() => {
                      const activeLeague = federations.flatMap((fed) => fed.leagues).find((league) => league.id === activeLeagueId);
                      const activeFederation = federations.find((fed) => fed.leagues.some((league) => league.id === activeLeagueId));
                      if (!activeFederation || !activeLeague) return null;
                      return (
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-center gap-3">
                            {activeFederation.logo_url && (
                              <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-white dark:bg-gray-700 rounded-lg p-1.5 border border-gray-200 dark:border-gray-600">
                                {isNextImageSafe(activeFederation.logo_url) ? (
                                  <Image
                                    src={activeFederation.logo_url}
                                    alt={activeFederation.nom}
                                    fill
                                    sizes="56px"
                                    className="object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={activeFederation.logo_url}
                                    alt={activeFederation.nom}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                    }}
                                  />
                                )}
                              </div>
                            )}
                            {activeLeague.logo_url && (
                              <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-white dark:bg-gray-700 rounded-lg p-1.5 border border-gray-200 dark:border-gray-600">
                                {isNextImageSafe(activeLeague.logo_url) ? (
                                  <Image
                                    src={activeLeague.logo_url}
                                    alt={activeLeague.nom}
                                    fill
                                    sizes="56px"
                                    className="object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={activeLeague.logo_url}
                                    alt={activeLeague.nom}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Ligue Section */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{t("federationSwitcher.title")}</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {federations.map((federation) => (
                          <div key={federation.id} className="space-y-1">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                              {getLocalizedName(locale, {
                                defaultValue: federation.nom,
                                fr: federation.nom,
                                en: federation.nom_en ?? federation.nom,
                                ar: federation.nom_ar ?? federation.nom,
                              })}
                            </p>
                            {federation.leagues.length === 0 ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1">{t("federationSwitcher.noLeagues")}</p>
                            ) : (
                              federation.leagues.map((league) => {
                                const leagueLabel = getLocalizedName(locale, {
                                  defaultValue: league.nom,
                                  fr: league.nom,
                                  en: league.nom_en ?? league.nom,
                                  ar: league.nom_ar ?? league.nom,
                                });
                                const isActive = league.id === activeLeagueId;
                                return (
                                  <button
                                    key={league.id}
                                    onClick={() => {
                                      switchLeague(league.id);
                                      setMobileMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                                      isActive
                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    {leagueLabel}
                                    {isActive && <span className="ml-2 text-xs">✓</span>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dark Mode Section */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Thème</p>
                      <button
                        onClick={() => {
                          toggleTheme();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <span>{theme === "light" ? "Mode sombre" : "Mode clair"}</span>
                        <span className="text-lg">{theme === "light" ? "🌙" : "☀️"}</span>
                      </button>
                    </div>

                    {/* Langue Section */}
                    <div className="p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Langue</p>
                      <div className="space-y-1">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              switchLocale(lang.code);
                              setMobileMenuOpen(false);
                              // Recharger complètement la page pour que tous les composants se rechargent avec la nouvelle langue
                              setTimeout(() => {
                                window.location.reload();
                              }, 100);
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                              locale === lang.code
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between gap-4 h-16">
            <Link href="/" className="flex items-center shrink-0">
              <Image src="/logo-light.png" alt="ARBINOTE" width={180} height={48} className="h-10 w-auto dark:hidden object-contain" priority />
              <Image src="/logo-dark.png" alt="ARBINOTE" width={180} height={48} className="h-10 w-auto hidden dark:block object-contain" priority />
            </Link>
            <div className="flex flex-1 justify-center gap-6 text-sm md:text-base">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <FederationSwitcher variant="admin" />
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
        onClick={() => setSidebarOpen(false)}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Sidebar */}
        <div
          className={`absolute left-0 top-0 h-full w-72 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <Link href="/" className="flex items-center" onClick={() => setSidebarOpen(false)}>
              <Image src="/logo-light.png" alt="ARBINOTE" width={160} height={40} className="h-9 w-auto dark:hidden object-contain" priority />
              <Image src="/logo-dark.png" alt="ARBINOTE" width={160} height={40} className="h-9 w-auto hidden dark:block object-contain" priority />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sidebar Navigation Links */}
          <nav className="flex flex-col p-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {link.icon && <i className={`${link.icon} w-5 text-center`}></i>}
                  <span>{link.label}</span>
                  {isActive && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
