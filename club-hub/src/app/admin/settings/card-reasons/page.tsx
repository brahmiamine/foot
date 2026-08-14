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
    <div className="container-fluid px-0">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link
          href="/admin/settings"
          className="btn btn-outline-secondary btn-sm"
        >
          <i className="fas fa-arrow-left" aria-hidden="true" />
        </Link>
        <h1 className="h4 mb-0">Motifs de carton</h1>
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
