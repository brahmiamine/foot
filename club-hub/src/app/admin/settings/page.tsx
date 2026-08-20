import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/services/SettingsService";
import { SettingsForm } from "./SettingsForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Réglages disciplinaires historiques. Ils restent le fallback tant qu'aucun
 * RuleSet CLUB-011 n'est applicable au contexte du match.
 */
export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");

  const settingsService = new SettingsService();
  const settings = await settingsService.get();

  return (
    <div className="container-fluid px-0 skote-settings-narrow">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h4 mb-0">Réglages disciplinaires</h1>
          <p className="text-muted small mb-0">Valeurs legacy utilisées uniquement lorsqu’aucune règle versionnée n’est applicable.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/discipline/rules" className="btn btn-primary btn-sm">
            Règles versionnées
          </Link>
          <Link
            href="/admin/settings/effective-configuration"
            className="btn btn-outline-primary btn-sm"
          >
            Configuration effective
          </Link>
          <Link
            href="/admin/settings/card-reasons"
            className="btn btn-outline-secondary btn-sm"
          >
            Motifs de carton
          </Link>
        </div>
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
