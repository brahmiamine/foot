import { getServerLocale, translate } from "@/lib/i18nServer";
import Link from "next/link";

export default async function PolitiqueCookiesPage() {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <Link
        href="/"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-6 inline-block text-sm"
      >
        {t("common.backToHome") || "← Retour à l'accueil"}
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t("cookies.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("cookies.lastUpdated")}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("cookies.section1.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("cookies.section1.paragraph1")}</p>
            <p>{t("cookies.section1.paragraph2")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("cookies.section2.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("cookies.section2.paragraph1")}</p>
            <ul className="list-disc list-inside space-y-3 ml-4">
              <li>
                <strong>{t("cookies.section2.list.item1.name")}:</strong> {t("cookies.section2.list.item1.description")}
                <div className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-4">
                  {t("cookies.section2.list.item1.usage")}
                </div>
              </li>
              <li>
                <strong>{t("cookies.section2.list.item2.name")}:</strong> {t("cookies.section2.list.item2.description")}
                <div className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-4">
                  {t("cookies.section2.list.item2.usage")}
                </div>
              </li>
              <li>
                <strong>{t("cookies.section2.list.item3.name")}:</strong> {t("cookies.section2.list.item3.description")}
                <div className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-4">
                  {t("cookies.section2.list.item3.usage")}
                </div>
              </li>
              <li>
                <strong>{t("cookies.section2.list.item4.name")}:</strong> {t("cookies.section2.list.item4.description")}
                <div className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-4">
                  {t("cookies.section2.list.item4.usage")}
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("cookies.section3.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("cookies.section3.paragraph1")}</p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>{t("cookies.section3.note.title")}</strong> {t("cookies.section3.note.text")}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("cookies.section4.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("cookies.section4.paragraph1")}</p>
            <p>{t("cookies.section4.paragraph2")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("cookies.section5.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("cookies.section5.paragraph1")}</p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{t("cookies.section5.contact.title")}</strong><br />
                {t("cookies.section5.contact.email")}
              </p>
            </div>
          </div>
        </section>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <p>{t("cookies.footer")}</p>
        </div>
      </div>
    </div>
  );
}

