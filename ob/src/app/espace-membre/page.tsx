import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { PageChrome } from "@/components/PageChrome";
import { getSsoSession, buildMemberLoginUrlForPath, buildLogoutUrl } from "@/lib/ssoSession";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Espace membre — Olympique de Béja",
};

export default async function EspaceMembrePage() {
  const session = await getSsoSession();

  if (!session) {
    redirect(await buildMemberLoginUrlForPath("/espace-membre"));
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const logoutUrl = buildLogoutUrl(`${proto}://${host}/`);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            Espace membre
          </h1>
          <div className={shared.card} style={{ padding: 24 }}>
            <p>
              Bienvenue, <strong>{session.name}</strong>.
            </p>
            <p>{session.email}</p>
            <a href={logoutUrl} className={shared.btnPrimary} style={{ marginTop: 16, display: "inline-block" }}>
              Se déconnecter
            </a>
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
