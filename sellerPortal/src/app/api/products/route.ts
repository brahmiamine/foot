import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { ProductImage } from "@/entities/ProductImage";
import { InventoryItem } from "@/entities/InventoryItem";
import { ProductCategory } from "@/entities/ProductCategory";
import { ProductStatus } from "@/entities/enums";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { slugify } from "@/lib/slug";

// GET /api/products — toujours filtré sur le vendeur de la session, jamais
// sur un sellerId fourni par le client (voir GET ?sellerId=... dans la
// spec comme contre-exemple à ne pas reproduire).
export async function GET(req: NextRequest) {
  try {
    const { session } = await requireActiveSeller();
    const url = new URL(req.url);
    const search = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status") as ProductStatus | null;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));

    const ds = await getDataSource();
    const qb = ds
      .getRepository(Product)
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.inventoryItems", "inventory")
      .where("product.sellerId = :sellerId", { sellerId: session.sellerId })
      .andWhere("product.deletedAt IS NULL");

    if (search) {
      qb.andWhere("(product.name LIKE :search OR product.sku LIKE :search)", { search: `%${search}%` });
    }
    if (status && Object.values(ProductStatus).includes(status)) {
      qb.andWhere("product.status = :status", { status });
    }

    const [products, total] = await qb
      .orderBy("product.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const items = products.map((p) => ({
      ...p,
      totalStock: (p.inventoryItems ?? []).reduce((sum, i) => sum + i.available, 0),
    }));

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(2).max(191),
  description: z.string().max(10000).optional(),
  shortDescription: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().max(191).optional(),
  sku: z.string().min(1).max(120),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  weightKg: z.number().positive().optional(),
  dimensions: z.string().max(120).optional(),
  images: z.array(z.string().max(500)).max(10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireActiveSeller();
    const body = createSchema.parse(await req.json());

    const ds = await getDataSource();
    const existingSku = await ds.getRepository(Product).findOne({ where: { sku: body.sku } });
    if (existingSku) {
      return NextResponse.json({ error: "Ce SKU est déjà utilisé." }, { status: 409 });
    }

    // Le référentiel de catégories est scopé par club : jamais faire
    // confiance à un categoryId envoyé par le client sans vérifier qu'il
    // appartient bien au club du vendeur connecté.
    if (body.categoryId) {
      const category = await ds
        .getRepository(ProductCategory)
        .findOne({ where: { id: body.categoryId, clubId: session.clubId } });
      if (!category) {
        return NextResponse.json({ error: "Catégorie introuvable." }, { status: 422 });
      }
    }

    const product = await ds.transaction(async (manager) => {
      const created = manager.create(Product, {
        sellerId: session.sellerId,
        name: body.name,
        slug: `${slugify(body.name)}-${Date.now().toString(36)}`,
        description: body.description ?? null,
        shortDescription: body.shortDescription ?? null,
        categoryId: body.categoryId ?? null,
        brand: body.brand ?? null,
        sku: body.sku,
        price: body.price.toFixed(3),
        compareAtPrice: body.compareAtPrice ? body.compareAtPrice.toFixed(3) : null,
        taxRate: (body.taxRate ?? 0).toFixed(2),
        weightKg: body.weightKg ? body.weightKg.toFixed(3) : null,
        dimensions: body.dimensions ?? null,
        status: ProductStatus.DRAFT,
      });
      await manager.save(created);

      if (body.images?.length) {
        const images = body.images.map((url, position) =>
          manager.create(ProductImage, { productId: created.id, url, position }),
        );
        await manager.save(images);
      }

      const inventory = manager.create(InventoryItem, {
        sellerId: session.sellerId,
        productId: created.id,
        variantId: null,
        available: 0,
      });
      await manager.save(inventory);

      return created;
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
