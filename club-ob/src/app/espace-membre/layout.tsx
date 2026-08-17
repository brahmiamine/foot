import { redirect } from "next/navigation";
import { PageChrome } from "@/components/PageChrome";
import { MemberTabs } from "@/components/MemberTabs";
import { getSsoSession, buildMemberLoginUrlForPath } from "@/lib/ssoSession";
import { fetchUnreadCount } from "@/lib/notificationApi";
import shared from "@/components/shared.module.css";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Espace membre — hub supporter. Une session staff/fédération ne doit jamais
 * être interprétée comme un compte supporter : seul le rôle SSO `MEMBER` peut
 * entrer dans cet espace et déclencher ses Server Actions.
 */
export default async function EspaceMembreLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getTranslator();
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") {
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
