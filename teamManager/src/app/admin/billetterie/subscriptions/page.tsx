import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { SubscriptionService } from "@/services/SubscriptionService";
import { SubscriptionsManagement } from "./SubscriptionsManagement";

export const dynamic = "force-dynamic";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Page Abonnements de saison — gestion des catégories d'abonnement du club
 * (nom/prix/couleur/fenêtre de validité) et roster en lecture seule des
 * abonnés, consommées/vendues côté app générique `billetterie`. Réservé
 * ADMIN.
 */
export default async function SubscriptionsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");

  const teamId = await requireTeamId();
  const service = new SubscriptionService();
  const [fetchedCategories, fetchedSubscriptions] = await Promise.all([
    service.listCategories(teamId),
    service.listSubscriptions(teamId),
  ]);

  const categories = fetchedCategories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    price: category.price,
    color: category.color,
    validFrom: toDateInputValue(category.validFrom),
    validUntil: toDateInputValue(category.validUntil),
    isActive: category.isActive,
  }));

  const subscribers = fetchedSubscriptions.map(({ subscription, purchaserName, purchaserEmail }) => ({
    id: subscription.id,
    reference: subscription.reference,
    categoryName: subscription.category?.name ?? "—",
    purchaserName,
    purchaserEmail,
    status: subscription.status,
    validFrom: toDateInputValue(subscription.validFrom),
    validUntil: toDateInputValue(subscription.validUntil),
    lastValidatedOn: subscription.lastValidatedOn ? toDateInputValue(subscription.lastValidatedOn) : null,
    revoked: subscription.revoked,
  }));

  return <SubscriptionsManagement initialCategories={categories} subscribers={subscribers} />;
}
