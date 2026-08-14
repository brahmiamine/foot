import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/States";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "medical.view")) redirect("/");

  const documents = await medicalPortalService.getDocuments(session.user.teamId, access.categories);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Documents</h1>

      {documents.length === 0 ? (
        <EmptyState title="Aucun document" description="Les documents ajoutés depuis une fiche de blessure apparaissent ici." />
      ) : (
        <Table>
          <Thead>
            <Th>Document</Th>
            <Th>Joueur</Th>
            <Th>Blessure</Th>
          </Thead>
          <tbody>
            {documents.map(({ injury, player, document }, idx) => (
              <Tr key={`${injury.id}-${idx}`}>
                <Td>
                  <a href={document.url} target="_blank" rel="noreferrer" style={{ color: "var(--mh-primary)" }}>
                    {document.name}
                  </a>
                </Td>
                <Td>{player ? `${player.firstNameFr} ${player.lastNameFr}` : injury.playerId}</Td>
                <Td>
                  <Link href={`/blessures/${injury.id}`} style={{ color: "var(--mh-primary)" }}>
                    {injury.zone}
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
