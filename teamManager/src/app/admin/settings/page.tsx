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
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Réglages disciplinaires</h1>
        <Link
          href="/admin/settings/card-reasons"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-sm transition-colors"
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
