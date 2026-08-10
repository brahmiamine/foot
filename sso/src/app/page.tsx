import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("home");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <h1>{t("connected")}</h1>
        <p style={{ color: "var(--sso-muted)" }}>
          {session.name} ({session.role}
          {session.teamId ? ` · ${t("clubSuffix", { teamId: session.teamId })}` : ""})
        </p>
        <p style={{ color: "var(--sso-muted)" }}>{t("returnToApp")}</p>
      </div>
    </div>
  );
}
