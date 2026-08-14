import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { CreateTrainingForm } from "@/components/portal/CreateTrainingForm";
import { CancelTrainingButton } from "@/components/portal/TrainingRowActions";
import { formatDateTime } from "@/lib/format";

const STATUS_META: Record<string, { label: string; tone: "info" | "success" | "danger" }> = {
  SCHEDULED: { label: "Prévu", tone: "info" },
  DONE: { label: "Réalisé", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "danger" },
};

export default async function EntrainementsPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "trainings.view")) redirect("/");

  const trainings = await staffPortalService.listTrainings(session.user.teamId, access.categories);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Entraînements</h1>
        {can(access, "trainings.create") && <CreateTrainingForm categories={access.categories} />}
      </div>

      {trainings.length === 0 && <EmptyState title="Aucun entraînement" description="Aucune séance programmée." />}

      {trainings.map((training) => (
        <Card key={training.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <Link href={`/entrainements/${training.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                {training.title}
              </Link>
              <div style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>{formatDateTime(training.date)}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Badge label={training.category} tone="neutral" />
                <Badge label={STATUS_META[training.status]?.label ?? training.status} tone={STATUS_META[training.status]?.tone ?? "neutral"} />
              </div>
            </div>
            {can(access, "trainings.edit") && training.status !== "CANCELLED" && <CancelTrainingButton id={training.id} />}
          </div>
        </Card>
      ))}
    </div>
  );
}
