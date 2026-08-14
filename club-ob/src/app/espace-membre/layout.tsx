import { redirect } from "next/navigation";
import { PageChrome } from "@/components/PageChrome";
import { MemberTabs } from "@/components/MemberTabs";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { fetchUnreadCount } from "@/lib/notificationApi";
import shared from "@/components/shared.module.css";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Espace membre — hub supporter (roadmap.md §8 "Espace supporter", §11
 * "Commandes/billets dans espace membre"). Centralise ce que le compte
 * `MEMBER` du SSO peut déjà exploiter aujourd'hui : profil, notifications et
 * préférences (via notifications). Mes billets/Mes commandes restent des
 * emplacements prêts à être branchés dès que la ticketing et le
 * marketplace supporter existeront (voir leurs pages respectives).
 */
export default async function EspaceMembreLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getTranslator();
  const session = await getSsoSession();
  if (!session) {
    redirect(await buildMemberLoginUrlForPath("/espace-membre"));
  }

  let unreadCount = 0;
  try {
    unreadCount = await fetchUnreadCount();
  } catch {
    // notifications indisponible : le hub reste utilisable, juste sans compteur.
  }

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            {t("member.title")}
          </h1>
          <p style={{ color: "var(--ob-text-faint)", marginBottom: 28 }}>
            {t("member.welcome", { name: session.name })}
          </p>
          <MemberTabs unreadCount={unreadCount} />
          <div style={{ marginTop: 24 }}>{children}</div>
        </div>
      </div>
    </PageChrome>
  );
}
