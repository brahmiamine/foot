import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { CreateInjuryForm } from "@/components/portal/CreateInjuryForm";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; tone: "danger" | "warning" | "success" }> = {
  ONGOING: { label: "En cours", tone: "danger" },
  RECOVERING: { label: "En récupération", tone: "warning" },
  RESOLVED: { label: "Résolue", tone: "success" },
};
const SEVERITY_LABEL: Record<string, string> = { MINOR: "Légère", MODERATE: "Modérée", SEVERE: "Sévère" };

export default async function BlessuresPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "medical.view")) redirect("/");

  const { teamId } = session.user;
  const [injuries, roster] = await Promise.all([
    medicalPortalService.listInjuries(teamId, access.categories, ["ONGOING", "RECOVERING"]),
    medicalPortalService.rosterInCategories(teamId, access.categories),
  ]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Blessures en cours</h1>
        {can(access, "medical.manage") && (
          <CreateInjuryForm roster={roster.map((p) => ({ id: p.id, label: `${p.number} — ${p.firstNameFr} ${p.lastNameFr}` }))} />
        )}
      </div>

      {injuries.length === 0 ? (
        <EmptyState title="Aucune blessure en cours" />
      ) : (
        <Table>
          <Thead>
            <Th>Joueur</Th>
            <Th>Zone</Th>
            <Th>Gravité</Th>
            <Th>Statut</Th>
            <Th>Date</Th>
            <Th></Th>
          </Thead>
          <tbody>
            {injuries.map(({ injury, player }) => (
              <Tr key={injury.id}>
                <Td>{player ? `${player.firstNameFr} ${player.lastNameFr}` : injury.playerId}</Td>
                <Td>{injury.zone}</Td>
                <Td>{SEVERITY_LABEL[injury.severity] ?? injury.severity}</Td>
                <Td>
                  <Badge label={STATUS_LABEL[injury.status]?.label ?? injury.status} tone={STATUS_LABEL[injury.status]?.tone ?? "danger"} />
                </Td>
                <Td>{formatDate(injury.injuryDate)}</Td>
                <Td>
                  <Link href={`/blessures/${injury.id}`} style={{ color: "var(--mh-primary)", fontWeight: 600, fontSize: "0.82rem" }}>
                    Détail
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
