import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; tone: "danger" | "warning" }> = {
  ONGOING: { label: "En cours", tone: "danger" },
  RECOVERING: { label: "En récupération", tone: "warning" },
};

export default async function IndisponiblesPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "medical.view")) redirect("/");

  const unavailable = await medicalPortalService.getUnavailablePlayers(session.user.teamId, access.categories);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Joueurs indisponibles</h1>

      {unavailable.length === 0 ? (
        <EmptyState title="Tout l'effectif est disponible" />
      ) : (
        <Table>
          <Thead>
            <Th>Joueur</Th>
            <Th>Zone</Th>
            <Th>Statut</Th>
            <Th>Retour estimé</Th>
            <Th></Th>
          </Thead>
          <tbody>
            {unavailable.map(({ injury, player }) => (
              <Tr key={injury.id}>
                <Td>{player ? `${player.firstNameFr} ${player.lastNameFr}` : injury.playerId}</Td>
                <Td>{injury.zone}</Td>
                <Td>
                  <Badge label={STATUS_LABEL[injury.status]?.label ?? injury.status} tone={STATUS_LABEL[injury.status]?.tone ?? "danger"} />
                </Td>
                <Td>{injury.expectedReturnDate ? formatDate(injury.expectedReturnDate) : "—"}</Td>
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
