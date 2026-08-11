import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, requirePermission } from "@/lib/access";
import { TicketCategoryService } from "@/services/TicketCategoryService";
import { TicketCategoriesManagement } from "./TicketCategoriesManagement";

export const dynamic = "force-dynamic";

/** Catalogue des catégories de billets du club (Gradin, Chaise, VIP...) — dynamique, jamais codé en dur. */
export default async function TicketCategoriesPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.view");

  const service = new TicketCategoryService();
  const categoriesData = await service.findAll(teamId);

  const categories = categoriesData.map((c) => ({
    id: c.id,
    name: c.name,
    nameAr: c.nameAr ?? null,
    description: c.description ?? null,
    price: parseFloat(c.price),
    color: c.color ?? null,
    isActive: c.isActive,
    displayOrder: c.displayOrder,
  }));

  return <TicketCategoriesManagement initialCategories={categories} canManage={can(access, "ticketing.manageCategories")} />;
}
