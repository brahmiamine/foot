import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import LoginForm from "@/components/LoginForm";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import type { Locale } from "@/i18n/locales";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const target = sanitizeRedirect(redirectParam) ?? "/";

  const session = await getCurrentSession();
  if (session) {
    redirect(target);
  }

  const t = await getTranslations("login");
  const locale = (await getLocale()) as Locale;

  return (
    <div className="sso-page">
      <LocaleSwitcher currentLocale={locale} />
      <div className="sso-card">
        <h1>{t("heading")}</h1>
        <p className="sso-muted">{t("subheading")}</p>
        <LoginForm redirectTo={target} />
      </div>
      <style>{`
        .sso-page {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .sso-card {
          width: 100%;
          max-width: 420px;
          background: var(--sso-card);
          border: 1px solid var(--sso-border);
          border-radius: 12px;
          padding: 32px;
        }
        .sso-card h1 {
          margin: 0 0 8px;
          font-size: 1.5rem;
        }
        .sso-muted {
          color: var(--sso-muted);
          font-size: 0.875rem;
          margin: 0 0 24px;
        }
      `}</style>
    </div>
  );
}
