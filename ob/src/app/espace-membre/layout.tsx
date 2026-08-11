import { redirect } from "next/navigation";
import { PageChrome } from "@/components/PageChrome";
import { MemberTabs } from "@/components/MemberTabs";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { fetchUnreadCount } from "@/lib/notificationApi";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

/**
 * Espace membre — hub supporter (roadmap.md §8 "Espace supporter", §11
 * "Commandes/billets dans espace membre"). Centralise ce que le compte
 * `MEMBER` du SSO peut déjà exploiter aujourd'hui : profil, notifications et
 * préférences (via notification-api). Mes billets/Mes commandes restent des
 * emplacements prêts à être branchés dès que la billetterie et le
 * marketplace supporter existeront (voir leurs pages respectives).
 */
export default async function EspaceMembreLayout({ children }: { children: React.ReactNode }) {
  const session = await getSsoSession();
  if (!session) {
    redirect(await buildMemberLoginUrlForPath("/espace-membre"));
  }

  let unreadCount = 0;
  try {
    unreadCount = await fetchUnreadCount();
  } catch {
    // notification-api indisponible : le hub reste utilisable, juste sans compteur.
  }

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Espace membre
          </h1>
          <p style={{ color: "var(--ob-text-faint)", marginBottom: 28 }}>
            Bienvenue, <strong>{session.name}</strong>.
          </p>
          <MemberTabs unreadCount={unreadCount} />
          <div style={{ marginTop: 24 }}>{children}</div>
        </div>
      </div>
    </PageChrome>
  );
}
