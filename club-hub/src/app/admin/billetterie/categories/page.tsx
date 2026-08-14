import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { TicketingService } from "@/services/TicketingService";
import { CategoriesManagement } from "./CategoriesManagement";

export const dynamic = "force-dynamic";

/**
 * Page Catégories de billets — gestion des catégories de ticketing du
 * club (Gradin/Chaise, Virage/Tribune/VIP, ...), consommées par l'app
 * générique `ticketing` pour la vente. Réservé ADMIN.
 */
export default async function TicketCategoriesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");

  const teamId = await requireTeamId();
  const service = new TicketingService();
  const fetchedCategories = await service.listCategories(teamId);

  const categories = fetchedCategories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    basePrice: category.basePrice,
    isActive: category.isActive,
  }));

  return <CategoriesManagement initialCategories={categories} />;
}
