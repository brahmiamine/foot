import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { ProductCategory } from "@/entities/ProductCategory";
import { ProductStatus } from "@/entities/enums";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { slugify } from "@/lib/slug";
import { createMarketplaceProduct } from "@/lib/marketplaceApiClient";

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

    const items = products.map((product) => ({
      ...product,
      totalStock: (product.inventoryItems ?? []).reduce((sum, item) => sum + item.available, 0),
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

    if (body.categoryId) {
      const category = await ds
        .getRepository(ProductCategory)
        .findOne({ where: { id: body.categoryId, clubId: session.clubId } });
      if (!category) {
        return NextResponse.json({ error: "Catégorie introuvable." }, { status: 422 });
      }
    }

    const product = await createMarketplaceProduct(session.sellerId, {
      name: body.name,
      slug: `${slugify(body.name)}-${Date.now().toString(36)}`,
      description: body.description ?? null,
      shortDescription: body.shortDescription ?? null,
      categoryId: body.categoryId ?? null,
      brand: body.brand ?? null,
      sku: body.sku,
      price: body.price,
      compareAtPrice: body.compareAtPrice ?? null,
      taxRate: body.taxRate ?? 0,
      weightKg: body.weightKg ?? null,
      dimensions: body.dimensions ?? null,
      images: body.images,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
