import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { listPlayerProfileRequests } from "@/lib/clubPlayerProfileClient";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { ProfileEditor } from "./ProfileEditor";

const POSITION_LABEL: Record<string, string> = {
  GOALKEEPER: "Gardien",
  DEFENDER: "Défenseur",
  MIDFIELDER: "Milieu",
  FORWARD: "Attaquant",
};

function dateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await auth();
  if (!session) return null;

  const player = await playerPortalService.getPlayer(session.user.playerId);
  if (!player) return null;

  let requests = [] as Awaited<ReturnType<typeof listPlayerProfileRequests>>["requests"];
  let profileServiceError: string | null = null;
  try {
    requests = (await listPlayerProfileRequests(session.user.playerId, session.user.id)).requests;
  } catch (error) {
    profileServiceError = error instanceof Error ? error.message : "Service de profil indisponible";
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mon profil</h1>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          {player.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.imageUrl} alt="" width={72} height={72} style={{ borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "var(--ph-primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                fontWeight: 700,
              }}
            >
              {player.number}
            </div>
          )}
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              {player.firstNameFr} {player.lastNameFr}
            </div>
            <div style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem" }}>
              N°{player.number} {player.position ? `— ${POSITION_LABEL[player.position] ?? player.position}` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: "0.9rem" }}>
          <div><div style={{ color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>Catégorie</div><div style={{ fontWeight: 600 }}>{player.category}</div></div>
          <div><div style={{ color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>Date de naissance</div><div style={{ fontWeight: 600 }}>{player.birthDate ? formatDate(player.birthDate) : "—"}</div></div>
          <div><div style={{ color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>Email</div><div style={{ fontWeight: 600 }}>{session.user.email}</div></div>
        </div>
      </Card>

      {profileServiceError ? (
        <Card>
          <p role="alert" style={{ margin: 0, color: "var(--ph-text-muted)" }}>
            Les modifications de profil sont temporairement indisponibles : {profileServiceError}
          </p>
        </Card>
      ) : (
        <ProfileEditor
          current={{
            imageUrl: player.imageUrl ?? null,
            firstNameFr: player.firstNameFr,
            lastNameFr: player.lastNameFr,
            firstNameAr: player.firstNameAr ?? null,
            lastNameAr: player.lastNameAr ?? null,
            birthDate: dateOnly(player.birthDate),
            position: player.position ?? null,
            number: player.number,
            category: player.category,
          }}
          requests={requests}
        />
      )}
    </div>
  );
}
