import { requireTeamId } from "@/lib/team-context";
import { ProductCategoryService } from "@/services/ProductCategoryService";
import { CategoriesManagement } from "./CategoriesManagement";

export const dynamic = "force-dynamic";

/**
 * Page Catégories boutique — gestion des catégories de produits du club.
 */
export default async function ProductCategoriesPage() {
  const teamId = await requireTeamId();
  const productCategoryService = new ProductCategoryService();
  const fetchedCategories = await productCategoryService.findAll(teamId);

  const categories = fetchedCategories.map((category) => ({
    id: category.id,
    nameFr: category.nameFr,
    nameAr: category.nameAr || null,
    createdAt: category.createdAt.toISOString(),
  }));

  return <CategoriesManagement initialCategories={categories} />;
}
