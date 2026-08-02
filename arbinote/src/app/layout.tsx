import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import FontAwesomeLoader from "@/components/FontAwesomeLoader";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { getServerLocale } from "@/lib/i18nServer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "ARBINOTE";
const siteDescriptionFr =
  "ARBINOTE est la plateforme internationale de référence pour noter et comparer les arbitres de football : calendrier, classements et votes en direct. Évaluez les performances des arbitres de tous les championnats, consultez les statistiques et participez à la notation en temps réel.";
const siteDescriptionEn =
  "ARBINOTE is the leading international platform to rate and compare football referees: schedule, rankings and live votes. Evaluate referee performances from all leagues worldwide, check statistics and participate in real-time rating.";
const siteDescriptionAr =
  "أربي نوت هي المنصة الدولية المرجعية لتقييم ومقارنة حكام كرة القدم: جدول المباريات، التصنيفات والتصويت المباشر. قيّم أداء الحكام من جميع البطولات حول العالم، راجع الإحصائيات وشارك في التقييم الفوري.";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// Keywords multilingues pour le SEO - Universels pour tous les championnats
const keywordsFr = [
  "ARBINOTE",
  "note arbitre",
  "notation arbitre",
  "évaluation arbitre",
  "classement arbitres",
  "notation arbitres",
  "vote arbitre",
  "statistiques arbitres",
  "performance arbitre",
  "arbitre football",
  "arbitrage football",
  "calendrier matchs",
  "résultats matchs",
  "meilleur arbitre",
  "classement officiel",
  "vote en direct",
  "notation en temps réel",
  "critères arbitrage",
  "VAR",
  "assistant arbitre",
  "décisions arbitrales",
  "football",
  "championnat",
  "ligue football",
  "arbitrage professionnel",
  "évaluation performance arbitre",
  "statistiques arbitrage",
  "classement international arbitres",
  "notation match",
  "vote match",
];

const keywordsEn = [
  "ARBINOTE",
  "referee rating",
  "referee evaluation",
  "referee scoring",
  "referee rankings",
  "referee statistics",
  "referee performance",
  "football referee",
  "soccer referee",
  "match schedule",
  "match results",
  "best referee",
  "official rankings",
  "live voting",
  "real-time rating",
  "refereeing criteria",
  "VAR",
  "assistant referee",
  "refereeing decisions",
  "football",
  "soccer",
  "championship",
  "league",
  "professional refereeing",
  "referee performance evaluation",
  "refereeing statistics",
  "international referee rankings",
  "match rating",
  "match voting",
  "referee comparison",
];

const keywordsAr = [
  "أربي نوت",
  "تقييم الحكام",
  "تقييم الحكم",
  "نقاط الحكم",
  "ترتيب الحكام",
  "إحصائيات الحكام",
  "أداء الحكم",
  "حكم كرة القدم",
  "التحكيم",
  "جدول المباريات",
  "نتائج المباريات",
  "أفضل حكم",
  "الترتيب الرسمي",
  "التصويت المباشر",
  "التقييم الفوري",
  "معايير التحكيم",
  "الفار",
  "الحكم المساعد",
  "قرارات التحكيم",
  "كرة القدم",
  "البطولة",
  "الدوري",
  "التحكيم الاحترافي",
  "تقييم أداء الحكم",
  "إحصائيات التحكيم",
  "ترتيب الحكام الدولي",
  "تقييم المباراة",
  "تصويت المباراة",
  "مقارنة الحكام",
];

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${siteName} | Plateforme Internationale de Notation des Arbitres | Évaluation Arbitres Football`,
    template: `%s | ${siteName}`,
  },
  description: siteDescriptionFr,
  applicationName: siteName,
  keywords: keywordsFr,
  authors: [{ name: siteName, url: baseUrl }],
  creator: siteName,
  publisher: siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: {
      "fr": "/fr",
      "en": "/en",
      "ar": "/ar",
      "x-default": "/",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", sizes: "any" },
      { url: "/logo-light.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/logo-light.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: `${siteName} | Plateforme Internationale de Notation des Arbitres`,
    description: siteDescriptionFr,
    url: baseUrl,
    siteName,
    locale: "fr_FR",
    alternateLocale: ["en_US", "ar_TN", "es_ES", "de_DE", "it_IT", "pt_PT"],
    type: "website",
    images: [
      {
        url: `${baseUrl}/logo-light.png`,
        width: 1200,
        height: 630,
        alt: `${siteName} - Plateforme internationale de notation des arbitres de football`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Plateforme Internationale de Notation des Arbitres`,
    description: siteDescriptionFr,
    images: [`${baseUrl}/logo-light.png`],
    creator: "@arbinote",
    site: "@arbinote",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
  },
  category: "Sports",
  classification: "Sports, Football, Soccer, Refereeing, Rating Platform, International, Global",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": siteName,
    "mobile-web-app-capable": "yes",
    "theme-color": "#1e40af",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await getServerLocale();
  const dir = initialLocale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={initialLocale} dir={dir} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <FontAwesomeLoader />
        <ServiceWorkerRegistration />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('arbinote-theme');
                  document.documentElement.classList.toggle(
                    'dark',
                    theme === 'dark' ||
                      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
                  );
                } catch (e) {}
              })();
            `,
          }}
        />
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
