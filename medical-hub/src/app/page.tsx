import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { getTranslator } from "@/i18n/server";
import { getAlertMessage } from "@/lib/dashboard";

export default async function DashboardPage() {
  const session = await auth(); if (!session) return null;
  const access = await getUserAccess(); if (!can(access, "medical.view")) redirect("/notifications");
  const { t } = await getTranslator(); const { teamId } = session.user;
  const [summary, alerts, unavailable] = await Promise.all([medicalPortalService.getAvailabilitySummary(teamId, access.categories), medicalPortalService.getAlerts(teamId, access.categories), medicalPortalService.getUnavailablePlayers(teamId, access.categories)]);
  return <div style={{ display: "grid", gap: "1.25rem" }}>
    <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{t("dashboard.title")}</h1>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem" }}><StatCard label={t("dashboard.stats.roster")} value={String(summary.totalPlayers)} tone="primary" /><StatCard label={t("dashboard.stats.available")} value={String(summary.available)} tone="success" /><StatCard label={t("dashboard.stats.ongoing")} value={String(summary.ongoing)} tone="danger" /><StatCard label={t("dashboard.stats.recovering")} value={String(summary.recovering)} tone="warning" /></div>
    <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600 }}>{t("dashboard.alerts.title")}</div><Link href="/alertes" style={{ fontSize: "0.8rem", color: "var(--mh-primary)", fontWeight: 600 }}>{t("common.viewAll")}</Link></div>{alerts.length === 0 ? <p style={{ color: "var(--mh-text-muted)", fontSize: "0.85rem", margin: 0 }}>{t("dashboard.alerts.empty")}</p> : <div style={{ display: "grid", gap: 8 }}>{alerts.slice(0, 5).map(({ injury, player, kind, daysDiff }) => { const message = getAlertMessage(kind, daysDiff); return <div key={injury.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}><span>{player ? `${player.firstNameFr} ${player.lastNameFr}` : injury.playerId} — {injury.zone}</span><Badge label={t(message.key, message.values)} tone={kind === "OVERDUE" ? "danger" : "warning"} /></div>; })}</div>}</Card>
    <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600 }}>{t("dashboard.unavailable.title")}</div><Link href="/indisponibles" style={{ fontSize: "0.8rem", color: "var(--mh-primary)", fontWeight: 600 }}>{t("common.viewAll")}</Link></div>{unavailable.length === 0 ? <p style={{ color: "var(--mh-text-muted)", fontSize: "0.85rem", margin: 0 }}>{t("dashboard.unavailable.empty")}</p> : <div style={{ display: "grid", gap: 8 }}>{unavailable.slice(0, 5).map(({ injury, player }) => <div key={injury.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}><span>{player ? `${player.firstNameFr} ${player.lastNameFr}` : injury.playerId} — {injury.zone}</span><span style={{ color: "var(--mh-text-muted)" }}>{t("dashboard.unavailable.expectedReturn", { date: injury.expectedReturnDate ? formatDate(injury.expectedReturnDate) : "—" })}</span></div>)}</div>}</Card>
  </div>;
}
