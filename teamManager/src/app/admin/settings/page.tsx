import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/services/SettingsService";
import { SettingsForm } from "./SettingsForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Page Réglages disciplinaires globaux — port de
 * cardManager/app/[locale]/admin/dashboard/settings. Réservé ADMIN.
 */
export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");

  const settingsService = new SettingsService();
  const settings = await settingsService.get();

  return (
    <div className="container-fluid px-0 skote-settings-narrow">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <h1 className="h4 mb-0">Réglages disciplinaires</h1>
        <Link
          href="/admin/settings/card-reasons"
          className="btn btn-outline-secondary btn-sm"
        >
          Motifs de carton
        </Link>
      </div>

      <SettingsForm
        settings={{
          yellowsBeforeSuspend: settings.yellowsBeforeSuspend,
          redCard1Matches: settings.redCard1Matches,
          redCard2Matches: settings.redCard2Matches,
          redCard3Matches: settings.redCard3Matches,
          yellowFineAmount: Number(settings.yellowFineAmount),
          redFineAmount: Number(settings.redFineAmount),
          fineDueDays: settings.fineDueDays,
          alertEmails: settings.alertEmails,
        }}
      />
    </div>
  );
}
