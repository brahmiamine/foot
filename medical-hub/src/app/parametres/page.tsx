import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Card } from "@/components/ui/Card";
import { MedicalSettingsForm } from "@/components/portal/MedicalSettingsForm";

export const dynamic = "force-dynamic";

export default async function MedicalSettingsPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "medical.manage")) redirect("/");

  const settings = await medicalPortalService.getSettings(session.user.teamId);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ fontSize: "1.2rem", margin: "0 0 4px" }}>Paramètres médicaux</h1>
        <p style={{ margin: 0, color: "var(--mh-text-muted)", fontSize: "0.85rem" }}>
          Règles de Return-to-Play et de clearance appliquées côté serveur.
        </p>
      </div>
      <Card>
        <MedicalSettingsForm
          clearanceRequired={settings.clearanceRequired}
          severeSecondOpinionRequired={settings.severeSecondOpinionRequired}
        />
      </Card>
    </div>
  );
}
