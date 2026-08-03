import { requireTeamId } from "@/lib/team-context";
import { ProductService } from "@/services/ProductService";
import { ProductCategoryService } from "@/services/ProductCategoryService";
import { ProductsManagement } from "./ProductsManagement";

export const dynamic = "force-dynamic";

/**
 * Page Produits boutique — gestion du catalogue (stock, prix, image),
 * pas de commande/paiement en V1.
 */
export default async function ProductsPage() {
  const teamId = await requireTeamId();
  const productService = new ProductService();
  const productCategoryService = new ProductCategoryService();

  const [fetchedProducts, fetchedCategories] = await Promise.all([
    productService.findAll(teamId),
    productCategoryService.findAll(teamId),
  ]);

  const products = fetchedProducts.map((product) => ({
    id: product.id,
    categoryId: product.categoryId ?? null,
    categoryNameFr: product.category?.nameFr ?? null,
    nameFr: product.nameFr,
    nameAr: product.nameAr || null,
    descriptionFr: product.descriptionFr || null,
    descriptionAr: product.descriptionAr || null,
    price: Number(product.price),
    stock: product.stock,
    imageUrl: product.imageUrl || null,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt ? product.updatedAt.toISOString() : null,
  }));

  const categories = fetchedCategories.map((category) => ({
    id: category.id,
    nameFr: category.nameFr,
    nameAr: category.nameAr || null,
  }));

  return <ProductsManagement initialProducts={products} categories={categories} />;
}
