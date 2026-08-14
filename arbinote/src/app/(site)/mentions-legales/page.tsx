import { getServerLocale, translate } from "@/lib/i18nServer";
import Link from "next/link";

export default async function MentionsLegalesPage() {
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
            {t("legal.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("legal.lastUpdated")}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("legal.section1.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p><strong>{t("legal.section1.name")}:</strong> {t("legal.section1.nameValue")}</p>
            <p><strong>{t("legal.section1.description")}:</strong> {t("legal.section1.descriptionValue")}</p>
            <p><strong>{t("legal.section1.url")}:</strong> {t("legal.section1.urlValue")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("legal.section2.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p><strong>{t("legal.section2.role")}:</strong> {t("legal.section2.roleValue")}</p>
            <p><strong>{t("legal.section2.responsibility")}:</strong> {t("legal.section2.responsibilityValue")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("legal.section3.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p><strong>{t("legal.section3.contact")}:</strong></p>
            <div className="ml-4 space-y-1">
              <p>{t("legal.section3.email")}: <a href={`mailto:${t("legal.section3.emailValue")}`} className="text-blue-600 dark:text-blue-400 hover:underline">{t("legal.section3.emailValue")}</a></p>
              <p>{t("legal.section3.website")}: <a href={t("legal.section3.websiteValue")} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{t("legal.section3.websiteValue")}</a></p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("legal.section4.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("legal.section4.paragraph1")}</p>
            <p><strong>{t("legal.section4.provider")}:</strong> {t("legal.section4.providerValue")}</p>
            <p><strong>{t("legal.section4.address")}:</strong> {t("legal.section4.addressValue")}</p>
            {t("legal.section4.websiteValue") && (
              <p><strong>{t("legal.section4.website")}:</strong> <a href={t("legal.section4.websiteValue")} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{t("legal.section4.websiteValue")}</a></p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("legal.section5.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("legal.section5.paragraph1")}</p>
            <p><strong>{t("legal.section5.responsible")}:</strong> {t("legal.section5.responsibleValue")}</p>
            <p><strong>{t("legal.section5.contact")}:</strong> <a href={`mailto:${t("legal.section5.contactValue")}`} className="text-blue-600 dark:text-blue-400 hover:underline">{t("legal.section5.contactValue")}</a></p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                {t("legal.section5.note")}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("legal.section6.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("legal.section6.paragraph1")}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t("legal.section6.list.item1")}</li>
              <li>{t("legal.section6.list.item2")}</li>
              <li>{t("legal.section6.list.item3")}</li>
            </ul>
            <p className="mt-4">{t("legal.section6.paragraph2")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("legal.section7.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("legal.section7.paragraph1")}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t("legal.section7.list.item1")}</li>
              <li>{t("legal.section7.list.item2")}</li>
              <li>{t("legal.section7.list.item3")}</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("legal.section8.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("legal.section8.paragraph1")}</p>
            <p>{t("legal.section8.paragraph2")}</p>
          </div>
        </section>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <p>{t("legal.footer")}</p>
        </div>
      </div>
    </div>
  );
}

