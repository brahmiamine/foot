import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";

const POSITION_LABEL: Record<string, string> = {
  GOALKEEPER: "Gardien",
  DEFENDER: "Défenseur",
  MIDFIELDER: "Milieu",
  FORWARD: "Attaquant",
};

export default async function ProfilPage() {
  const session = await auth();
  if (!session) return null;

  const player = await playerPortalService.getPlayer(session.user.playerId);
  if (!player) return null;

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
          <div>
            <div style={{ color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>Catégorie</div>
            <div style={{ fontWeight: 600 }}>{player.category}</div>
          </div>
          <div>
            <div style={{ color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>Date de naissance</div>
            <div style={{ fontWeight: 600 }}>{player.birthDate ? formatDate(player.birthDate) : "—"}</div>
          </div>
          <div>
            <div style={{ color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>Email</div>
            <div style={{ fontWeight: 600 }}>{session.user.email}</div>
          </div>
        </div>

        <p style={{ color: "var(--ph-text-subtle)", fontSize: "0.78rem", marginTop: 16, marginBottom: 0 }}>
          Pour toute modification de votre fiche (photo, poste, date de naissance...), contactez le staff de votre club.
        </p>
      </Card>
    </div>
  );
}
