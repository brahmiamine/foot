import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; tone: "danger" | "warning" | "success" }> = {
  ONGOING: { label: "En cours", tone: "danger" },
  RECOVERING: { label: "En récupération", tone: "warning" },
  RESOLVED: { label: "Résolue", tone: "success" },
};

export default async function HistoriquePage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "medical.view")) redirect("/");

  const injuries = await medicalPortalService.listInjuries(session.user.teamId, access.categories);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Historique des blessures</h1>

      {injuries.length === 0 ? (
        <EmptyState title="Aucune blessure enregistrée" />
      ) : (
        <Table>
          <Thead>
            <Th>Joueur</Th>
            <Th>Zone</Th>
            <Th>Date</Th>
            <Th>Retour effectif</Th>
            <Th>Statut</Th>
            <Th></Th>
          </Thead>
          <tbody>
            {injuries.map(({ injury, player }) => (
              <Tr key={injury.id}>
                <Td>{player ? `${player.firstNameFr} ${player.lastNameFr}` : injury.playerId}</Td>
                <Td>{injury.zone}</Td>
                <Td>{formatDate(injury.injuryDate)}</Td>
                <Td>{injury.actualReturnDate ? formatDate(injury.actualReturnDate) : "—"}</Td>
                <Td>
                  <Badge label={STATUS_LABEL[injury.status]?.label ?? injury.status} tone={STATUS_LABEL[injury.status]?.tone ?? "danger"} />
                </Td>
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
