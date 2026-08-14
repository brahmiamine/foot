import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { CreateTripForm } from "@/components/portal/CreateTripForm";
import { formatDateTime } from "@/lib/format";

export default async function DeplacementsPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "trips.view")) redirect("/");

  const trips = await staffPortalService.listTrips(session.user.teamId, access.categories);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Déplacements</h1>
        {can(access, "trips.manage") && <CreateTripForm categories={access.categories} />}
      </div>

      {trips.length === 0 && <EmptyState title="Aucun déplacement" />}

      {trips.map((trip) => (
        <Card key={trip.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <Link href={`/deplacements/${trip.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                {trip.meetingPoint ?? "Point de rendez-vous à confirmer"}
              </Link>
              <div style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>Départ : {formatDateTime(trip.departureTime)}</div>
              <div style={{ marginTop: 6 }}>
                <Badge label={trip.category} tone="neutral" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
