import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CardReasonService } from "@/services/CardReasonService";
import { CardReasonsList } from "./CardReasonsList";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Page Motifs de carton (communs à tous les clubs) — port de
 * cardManager/app/[locale]/admin/dashboard/settings/card-reasons. Réservé ADMIN.
 */
export default async function CardReasonsSettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin/settings");

  const cardReasonService = new CardReasonService();
  const reasons = await cardReasonService.findAll();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/settings"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-sm transition-colors"
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Motifs de carton</h1>
      </div>

      <CardReasonsList
        initialReasons={reasons.map((r) => ({
          id: r.id,
          labelFr: r.labelFr,
          labelAr: r.labelAr ?? null,
          type: r.type,
          isActive: r.isActive,
        }))}
      />
    </div>
  );
}
