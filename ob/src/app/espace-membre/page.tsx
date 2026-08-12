import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { headers } from "next/headers";
import { getSsoSession, buildLogoutUrl } from "@/lib/ssoSession";
import { fetchMemberProfile, type MemberProfile } from "@/lib/ssoProfileClient";
import { MemberProfileForm } from "@/components/MemberProfileForm";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.profile");

export default async function ProfilPage() {
  const { t } = await getTranslator();
  const session = await getSsoSession();
  if (!session) return null; // garde déjà assurée par le layout parent

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const logoutUrl = buildLogoutUrl(`${proto}://${host}/`);

  let profile: MemberProfile = { firstName: null, lastName: null, phoneNumber: null };
  try {
    profile = await fetchMemberProfile();
  } catch (error) {
    console.error("fetchMemberProfile failed on profil page:", error);
  }

  return (
    <div className={shared.card} style={{ padding: 24, maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>{t("member.profile")}</h2>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: "16px 0" }}>
        <dt style={{ color: "var(--ob-text-faint)" }}>{t("member.name")}</dt>
        <dd style={{ margin: 0 }}>{session.name}</dd>
        <dt style={{ color: "var(--ob-text-faint)" }}>{t("member.email")}</dt>
        <dd style={{ margin: 0 }}>{session.email}</dd>
      </dl>

      <h3 style={{ fontSize: 15, marginBottom: 0 }}>{t("member.details")}</h3>
      <p style={{ fontSize: 13, color: "var(--ob-text-faint)", margin: "4px 0 0" }}>
        {t("member.profileHint")}
      </p>
      <MemberProfileForm initialProfile={profile} />

      <form method="POST" action={logoutUrl} style={{ marginTop: 20 }}>
        <button type="submit" className={shared.btnPrimary} style={{ border: "none", cursor: "pointer" }}>
          {t("member.logout")}
        </button>
      </form>
    </div>
  );
}
