import { getServerLocale, translate } from "@/lib/i18nServer";
import Link from "next/link";

export default async function ConditionsGeneralesPage() {
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
            {t("terms.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("terms.lastUpdated")}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section1.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section1.paragraph1")}</p>
            <p>{t("terms.section1.paragraph2")}</p>
            <p>{t("terms.section1.paragraph3")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section2.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section2.paragraph1")}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t("terms.section2.list.item1")}</li>
              <li>{t("terms.section2.list.item2")}</li>
              <li>{t("terms.section2.list.item3")}</li>
              <li>{t("terms.section2.list.item4")}</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section3.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section3.paragraph1")}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t("terms.section3.list.item1")}</li>
              <li>{t("terms.section3.list.item2")}</li>
              <li>{t("terms.section3.list.item3")}</li>
              <li>{t("terms.section3.list.item4")}</li>
            </ul>
            <p className="mt-4">{t("terms.section3.paragraph2")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section4.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section4.paragraph1")}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t("terms.section4.list.item1")}</li>
              <li>{t("terms.section4.list.item2")}</li>
              <li>{t("terms.section4.list.item3")}</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section5.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section5.paragraph1")}</p>
            <p>{t("terms.section5.paragraph2")}</p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>{t("terms.section5.note.title")}</strong> {t("terms.section5.note.text")}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section6.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section6.paragraph1")}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t("terms.section6.list.item1")}</li>
              <li>{t("terms.section6.list.item2")}</li>
              <li>{t("terms.section6.list.item3")}</li>
              <li>{t("terms.section6.list.item4")}</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section7.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section7.paragraph1")}</p>
            <p>{t("terms.section7.paragraph2")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section8.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section8.paragraph1")}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t("terms.section8.list.item1")}</li>
              <li>{t("terms.section8.list.item2")}</li>
              <li>{t("terms.section8.list.item3")}</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section9.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section9.paragraph1")}</p>
            <p>{t("terms.section9.paragraph2")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section10.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section10.paragraph1")}</p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{t("terms.section10.contact.title")}</strong><br />
                {t("terms.section10.contact.email")}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t("terms.section11.title")}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 space-y-3 text-sm sm:text-base leading-relaxed">
            <p>{t("terms.section11.paragraph1")}</p>
            <p>{t("terms.section11.paragraph2")}</p>
          </div>
        </section>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <p>{t("terms.footer")}</p>
        </div>
      </div>
    </div>
  );
}

