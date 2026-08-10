import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <h1>Connecté</h1>
        <p style={{ color: "var(--sso-muted)" }}>
          {session.name} ({session.role}
          {session.teamId ? ` · club ${session.teamId}` : ""})
        </p>
        <p style={{ color: "var(--sso-muted)" }}>
          Revenez sur l&apos;application souhaitée — vous êtes déjà authentifié.
        </p>
      </div>
    </div>
  );
}
