"use client";

import Link from "next/link";
import { useTranslations } from "@/lib/i18n";

export default function Footer() {
  const { t } = useTranslations();

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-16 pb-20 md:pb-12">
      <div className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Section Comment ça marche ? */}
          <div className="rounded-3xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-6">
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">{t("home.howItWorks.title")}</h3>
            <ul className="grid gap-3 text-gray-700 dark:text-gray-200 md:grid-cols-3">
              <li className="rounded-2xl bg-white/70 dark:bg-blue-900/40 px-4 py-3 text-sm font-medium shadow-sm">{t("home.howItWorks.step1")}</li>
              <li className="rounded-2xl bg-white/70 dark:bg-blue-900/40 px-4 py-3 text-sm font-medium shadow-sm">{t("home.howItWorks.step2")}</li>
              <li className="rounded-2xl bg-white/70 dark:bg-blue-900/40 px-4 py-3 text-sm font-medium shadow-sm">{t("home.howItWorks.step3")}</li>
            </ul>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} ARBINOTE. {t("common.allRightsReserved")}
              </p>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
                <Link
                  href="/politique-de-confidentialite"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  {t("common.privacyPolicy")}
                </Link>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <Link
                  href="/conditions-generales"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  {t("common.termsOfService")}
                </Link>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <Link
                  href="/mentions-legales"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  {t("common.legalNotice")}
                </Link>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <Link href="/contact" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
                  {t("common.contact")}
                </Link>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <Link
                  href="/transparence"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  Transparence
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
