/**
 * Jeu de données de démonstration pour ob-seller-portal.
 *
 * Usage :
 *   cp .env.example .env.local   # renseigner DB_* (voir ../start.sh)
 *   npm run seed
 *
 * Crée un vendeur ACTIVE de démo (email: demo@vendeur-ob.tn / mot de passe:
 * Vendeur123!) avec des produits, du stock, une commande à chaque étape du
 * cycle de vie et un payout, pour pouvoir explorer l'app sans dépendre
 * d'une vraie Marketplace API. Idempotent : peut être relancé sans dupliquer
 * le vendeur de démo (basé sur son email).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import "reflect-metadata";
import { getDataSource } from "../src/lib/database";
import { Seller } from "../src/entities/Seller";
import { SellerUser } from "../src/entities/SellerUser";
import { ProductCategory } from "../src/entities/ProductCategory";
import { Product } from "../src/entities/Product";
import { ProductVariant } from "../src/entities/ProductVariant";
import { InventoryItem } from "../src/entities/InventoryItem";
import { MarketOrder } from "../src/entities/MarketOrder";
import { SellerOrder } from "../src/entities/SellerOrder";
import { SellerOrderItem } from "../src/entities/SellerOrderItem";
import { ReturnRequest } from "../src/entities/ReturnRequest";
import { Payout } from "../src/entities/Payout";
import { Notification } from "../src/entities/Notification";
import { hashPassword } from "../src/lib/password";
import {
  SellerStatus,
  SellerUserRole,
  ProductStatus,
  SellerOrderStatus,
  ReturnStatus,
  PayoutStatus,
  NotificationType,
} from "../src/entities/enums";

async function main() {
  const ds = await getDataSource();

  const categoryRepo = ds.getRepository(ProductCategory);
  let category = await categoryRepo.findOne({ where: { slug: "maillots" } });
  if (!category) {
    category = await categoryRepo.save(categoryRepo.create({ name: "Maillots", slug: "maillots" }));
  }

  const sellerRepo = ds.getRepository(Seller);
  let seller = await sellerRepo.findOne({ where: { email: "demo@vendeur-ob.tn" } });
  if (!seller) {
    seller = await sellerRepo.save(
      sellerRepo.create({
        businessName: "Sport Shop Béja",
        ownerName: "Mohamed Brahmi",
        email: "demo@vendeur-ob.tn",
        phone: "+216 20 000 000",
        address: "12 avenue Habib Bourguiba",
        city: "Béja",
        country: "Tunisie",
        description: "Équipementier sportif partenaire de l'Olympique de Béja.",
        activityCategory: "Textile sportif",
        status: SellerStatus.ACTIVE,
        commissionRate: "10.00",
      }),
    );
    console.log(`Vendeur de démo créé : ${seller.id}`);
  } else {
    console.log(`Vendeur de démo déjà présent : ${seller.id}`);
  }

  const userRepo = ds.getRepository(SellerUser);
  let sellerUser = await userRepo.findOne({ where: { email: "demo@vendeur-ob.tn" } });
  if (!sellerUser) {
    sellerUser = await userRepo.save(
      userRepo.create({
        sellerId: seller.id,
        name: "Mohamed Brahmi",
        email: "demo@vendeur-ob.tn",
        passwordHash: await hashPassword("Vendeur123!"),
        role: SellerUserRole.OWNER,
      }),
    );
    console.log("Compte de connexion créé : demo@vendeur-ob.tn / Vendeur123!");
  }

  const productRepo = ds.getRepository(Product);
  const variantRepo = ds.getRepository(ProductVariant);
  const inventoryRepo = ds.getRepository(InventoryItem);

  let published = await productRepo.findOne({ where: { sku: "MAILLOT-OB-2026" } });
  if (!published) {
    published = await productRepo.save(
      productRepo.create({
        sellerId: seller.id,
        name: "Maillot OB 2026",
        slug: "maillot-ob-2026",
        description: "Maillot officiel domicile de l'Olympique de Béja, saison 2025-2026.",
        shortDescription: "Maillot domicile officiel",
        categoryId: category.id,
        brand: "OB Sport",
        sku: "MAILLOT-OB-2026",
        price: "50.000",
        taxRate: "19.00",
        status: ProductStatus.PUBLISHED,
        isActive: true,
      }),
    );

    for (const size of ["S", "M", "L", "XL"]) {
      const variant = await variantRepo.save(
        variantRepo.create({
          productId: published.id,
          sku: `MAILLOT-OB-2026-${size}`,
          attributes: { Taille: size },
        }),
      );
      await inventoryRepo.save(
        inventoryRepo.create({
          sellerId: seller.id,
          productId: published.id,
          variantId: variant.id,
          available: size === "XL" ? 0 : 15,
        }),
      );
    }
    console.log("Produit publié créé avec variantes : Maillot OB 2026");
  }

  let draft = await productRepo.findOne({ where: { sku: "ECHARPE-OB-2026" } });
  if (!draft) {
    draft = await productRepo.save(
      productRepo.create({
        sellerId: seller.id,
        name: "Écharpe supporter OB",
        slug: "echarpe-supporter-ob",
        shortDescription: "Écharpe officielle des supporters",
        categoryId: category.id,
        sku: "ECHARPE-OB-2026",
        price: "20.000",
        status: ProductStatus.DRAFT,
      }),
    );
    await inventoryRepo.save(
      inventoryRepo.create({ sellerId: seller.id, productId: draft.id, variantId: null, available: 40 }),
    );
    console.log("Produit brouillon créé : Écharpe supporter OB");
  }

  let rejected = await productRepo.findOne({ where: { sku: "CASQUETTE-OB-2026" } });
  if (!rejected) {
    rejected = await productRepo.save(
      productRepo.create({
        sellerId: seller.id,
        name: "Casquette OB",
        slug: "casquette-ob",
        sku: "CASQUETTE-OB-2026",
        price: "15.000",
        status: ProductStatus.REJECTED,
        rejectionReason: "Image non conforme aux règles de la marketplace.",
      }),
    );
    await inventoryRepo.save(
      inventoryRepo.create({ sellerId: seller.id, productId: rejected.id, variantId: null, available: 0 }),
    );
    console.log("Produit refusé créé : Casquette OB");
  }

  const orderRepo = ds.getRepository(MarketOrder);
  const sellerOrderRepo = ds.getRepository(SellerOrder);
  const sellerOrderItemRepo = ds.getRepository(SellerOrderItem);

  const existingOrders = await sellerOrderRepo.count({ where: { sellerId: seller.id } });
  if (existingOrders === 0) {
    const scenarios: { status: SellerOrderStatus; customer: string; qty: number }[] = [
      { status: SellerOrderStatus.PENDING, customer: "Mohamed Brahmi", qty: 2 },
      { status: SellerOrderStatus.PROCESSING, customer: "Amine Trabelsi", qty: 1 },
      { status: SellerOrderStatus.READY_TO_SHIP, customer: "Sarra Gharbi", qty: 3 },
      { status: SellerOrderStatus.DELIVERED, customer: "Karim Jaziri", qty: 1 },
    ];

    let seq = 10025;
    for (const s of scenarios) {
      const marketOrder = await orderRepo.save(
        orderRepo.create({
          orderNumber: `OB-${seq++}`,
          customerName: s.customer,
          customerEmail: `${s.customer.toLowerCase().replace(/\s+/g, ".")}@example.tn`,
          customerPhone: "+216 20 111 222",
          shippingAddress: "Béja, Tunisie",
          totalAmount: (50 * s.qty).toFixed(3),
        }),
      );

      const commissionRate = Number(seller.commissionRate);
      const subtotal = 50 * s.qty;
      const commissionAmount = (subtotal * commissionRate) / 100;
      const netAmount = subtotal - commissionAmount;

      const sellerOrder = await sellerOrderRepo.save(
        sellerOrderRepo.create({
          orderId: marketOrder.id,
          sellerId: seller.id,
          status: s.status,
          subtotal: subtotal.toFixed(3),
          commissionRate: commissionRate.toFixed(2),
          commissionAmount: commissionAmount.toFixed(3),
          netAmount: netAmount.toFixed(3),
          shippingCarrier: s.status === SellerOrderStatus.DELIVERED ? "Rapide Poste" : null,
          trackingNumber: s.status === SellerOrderStatus.DELIVERED ? "RP123456789TN" : null,
          shippedAt: s.status === SellerOrderStatus.DELIVERED ? new Date() : null,
        }),
      );

      const item = await sellerOrderItemRepo.save(
        sellerOrderItemRepo.create({
          sellerOrderId: sellerOrder.id,
          productId: published!.id,
          productName: published!.name,
          sku: published!.sku,
          variantLabel: "M",
          quantity: s.qty,
          unitPrice: "50.000",
          totalPrice: subtotal.toFixed(3),
        }),
      );

      if (s.status === SellerOrderStatus.DELIVERED) {
        await ds.getRepository(ReturnRequest).save(
          ds.getRepository(ReturnRequest).create({
            sellerId: seller.id,
            sellerOrderId: sellerOrder.id,
            sellerOrderItemId: item.id,
            customerName: s.customer,
            reason: "Taille ne convient pas.",
            status: ReturnStatus.REQUESTED,
          }),
        );
      }
    }
    console.log("4 commandes de démonstration créées (une par étape du cycle).");
  }

  const payoutRepo = ds.getRepository(Payout);
  const existingPayouts = await payoutRepo.count({ where: { sellerId: seller.id } });
  if (existingPayouts === 0) {
    await payoutRepo.save(
      payoutRepo.create({
        sellerId: seller.id,
        reference: "P-1024",
        amount: "1250.000",
        status: PayoutStatus.PAID,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        paidAt: new Date("2026-08-20"),
      }),
    );
    console.log("Payout de démonstration créé : P-1024");
  }

  const notificationRepo = ds.getRepository(Notification);
  const existingNotifications = await notificationRepo.count({ where: { sellerId: seller.id } });
  if (existingNotifications === 0) {
    await notificationRepo.save([
      notificationRepo.create({
        sellerId: seller.id,
        type: NotificationType.PRODUCT_REJECTED,
        title: "Produit refusé",
        message: "Casquette OB a été refusée : image non conforme aux règles de la marketplace.",
      }),
      notificationRepo.create({
        sellerId: seller.id,
        type: NotificationType.NEW_ORDER,
        title: "Nouvelle commande",
        message: "Vous avez reçu une nouvelle commande OB-10025.",
      }),
      notificationRepo.create({
        sellerId: seller.id,
        type: NotificationType.PAYOUT_PAID,
        title: "Payout effectué",
        message: "Le payout P-1024 de 1250.000 DT a été payé.",
        isRead: true,
      }),
    ]);
    console.log("Notifications de démonstration créées.");
  }

  await ds.destroy();
  console.log("\nSeed terminé. Connexion : demo@vendeur-ob.tn / Vendeur123!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
