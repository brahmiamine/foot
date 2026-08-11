import { notFound } from "next/navigation";
import Link from "next/link";
import { getSsoSession } from "@/lib/ssoSession";
import { PageChrome } from "@/components/PageChrome";
import { ModerationActionButton } from "@/components/ModerationActionButton";
import { ModerationService } from "@/services/ModerationService";
import { formatFullDateTime } from "@/lib/format";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  HIDE_POST: "Publication masquée",
  HIDE_COMMENT: "Commentaire masqué",
  BLOCK_USER: "Utilisateur bloqué",
  UNBLOCK_USER: "Utilisateur débloqué",
  APPROVE_FAN_WALL: "Tribune approuvée",
  REJECT_FAN_WALL: "Tribune rejetée",
  RESOLVE_REPORT: "Signalement traité",
  DISMISS_REPORT: "Signalement rejeté",
};

export default async function ModerationPage() {
  const session = await getSsoSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    notFound();
  }

  const service = new ModerationService();
  const [reports, pendingFanWall, blockedUsers, history] = await Promise.all([
    service.listOpenReports(),
    service.listPendingFanWall(),
    service.listBlockedUsers(),
    service.listHistory(30),
  ]);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Modération
          </h1>
          <p style={{ marginBottom: 28 }}>
            <Link href="/communaute/admin/sondages">→ Sondages</Link>
          </p>

          <h2 className={shared.sectionSubtitle}>Signalements ouverts ({reports.length})</h2>
          {reports.length === 0 ? (
            <p className={shared.empty}>Aucun signalement en attente.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
              {reports.map((r) => (
                <div key={r.id} className={shared.card} style={{ padding: 16 }}>
                  <p style={{ fontSize: 12, color: "var(--ob-text-faint)", margin: "0 0 6px" }}>
                    {r.targetType} — signalé par {r.reporterName} le {formatFullDateTime(r.createdAt)}
                    {r.reason ? ` — motif : ${r.reason}` : ""}
                  </p>
                  <p style={{ margin: "0 0 10px" }}>{r.preview}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {r.targetType === "POST" && (
                      <ModerationActionButton action="HIDE_POST" targetId={r.targetId} label="Masquer la publication" variant="danger" />
                    )}
                    {r.targetType === "COMMENT" && (
                      <ModerationActionButton action="HIDE_COMMENT" targetId={r.targetId} label="Masquer le commentaire" variant="danger" />
                    )}
                    {r.authorUserId && (
                      <ModerationActionButton
                        action="BLOCK_USER"
                        targetId={r.authorUserId}
                        label={`Bloquer ${r.authorName}`}
                        variant="danger"
                      />
                    )}
                    <ModerationActionButton action="DISMISS_REPORT" targetId={r.id} label="Rejeter le signalement" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className={shared.sectionSubtitle}>Tribune des supporters en attente ({pendingFanWall.length})</h2>
          {pendingFanWall.length === 0 ? (
            <p className={shared.empty}>Rien à valider.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
              {pendingFanWall.map((item) => (
                <div key={item.id} className={shared.card} style={{ padding: 16 }}>
                  <p style={{ fontSize: 12, color: "var(--ob-text-faint)", margin: "0 0 6px" }}>
                    {item.authorName} — {formatFullDateTime(item.createdAt)}
                  </p>
                  {item.message && <p style={{ margin: "0 0 10px" }}>{item.message}</p>}
                  {item.imageUrl && <p style={{ margin: "0 0 10px" }}>Image : {item.imageUrl}</p>}
                  {item.videoUrl && <p style={{ margin: "0 0 10px" }}>Vidéo : {item.videoUrl}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <ModerationActionButton action="APPROVE_FAN_WALL" targetId={item.id} label="Approuver" />
                    <ModerationActionButton action="REJECT_FAN_WALL" targetId={item.id} label="Rejeter" variant="danger" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className={shared.sectionSubtitle}>Utilisateurs bloqués ({blockedUsers.length})</h2>
          {blockedUsers.length === 0 ? (
            <p className={shared.empty}>Aucun utilisateur bloqué.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 40 }}>
              {blockedUsers.map((u) => (
                <div
                  key={u.userId}
                  className={shared.card}
                  style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span>{u.name}</span>
                  <ModerationActionButton action="UNBLOCK_USER" targetId={u.userId} label="Débloquer" />
                </div>
              ))}
            </div>
          )}

          <h2 className={shared.sectionSubtitle}>Historique de modération</h2>
          {history.length === 0 ? (
            <p className={shared.empty}>Aucune action pour le moment.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.map((h) => (
                <div key={h.id} style={{ fontSize: 13, color: "var(--ob-text-muted)" }}>
                  {formatFullDateTime(h.createdAt)} — {h.actorName} — {ACTION_LABELS[h.action] ?? h.action} (
                  {h.targetType} {h.targetId}){h.reason ? ` — ${h.reason}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
