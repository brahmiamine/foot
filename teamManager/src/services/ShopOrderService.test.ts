import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { seedTeamWithProduct } from "@/test/fixtures";
import { Product } from "@/entities/Product";
import { ShopOrder } from "@/entities/ShopOrder";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

const initPayment = vi.fn();
const getPaymentStatus = vi.fn();
vi.mock("@/lib/paymentApiClient", () => ({
  getPaymentProvider: () => "konnect",
  initPayment: (...args: unknown[]) => initPayment(...args),
  getPaymentStatus: (...args: unknown[]) => getPaymentStatus(...args),
}));

beforeEach(async () => {
  dataSource = await createTestDataSource();
  initPayment.mockReset();
  getPaymentStatus.mockReset();
});

afterEach(async () => {
  await dataSource.destroy();
});

describe("createOrder (SQLite réel)", () => {
  it("décrémente le stock, crée la commande PENDING puis y attache le paymentId", async () => {
    const { createOrder } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });

    const result = await createOrder({
      purchaserId: "user-1",
      teamId: team.id,
      items: [{ productId: product.id, quantity: 2 }],
    });

    expect(result.payUrl).toBe("https://pay.example.com/pay_1");
    expect(result.order.status).toBe("PENDING");
    expect(result.order.totalPrice).toBe("40.000");

    const reloadedProduct = await dataSource.getRepository(Product).findOneOrFail({ where: { id: product.id } });
    expect(reloadedProduct.stock).toBe(3);

    const reloadedOrder = await dataSource.getRepository(ShopOrder).findOneOrFail({ where: { id: result.order.id } });
    expect(reloadedOrder.paymentId).toBe("pay_1");
  });

  it("refuse une quantité supérieure au stock disponible (ConflictError), sans modifier le stock", async () => {
    const { createOrder } = await import("./ShopOrderService");
    const { ConflictError } = await import("@/lib/errors");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 2 });

    await expect(
      createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 3 }] }),
    ).rejects.toThrow(ConflictError);

    const reloadedProduct = await dataSource.getRepository(Product).findOneOrFail({ where: { id: product.id } });
    expect(reloadedProduct.stock).toBe(2);
    expect(initPayment).not.toHaveBeenCalled();
  });

  it("refuse un produit désactivé", async () => {
    const { createOrder } = await import("./ShopOrderService");
    const { NotFoundError } = await import("@/lib/errors");
    const { team, product } = await seedTeamWithProduct(dataSource, { isActive: false });

    await expect(
      createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 1 }] }),
    ).rejects.toThrow(NotFoundError);
  });

  it("libère le stock si l'initiation payment-api échoue (compensation)", async () => {
    const { createOrder } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });
    initPayment.mockRejectedValue(new Error("payment-api down"));

    await expect(
      createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 2 }] }),
    ).rejects.toThrow("payment-api down");

    const reloadedProduct = await dataSource.getRepository(Product).findOneOrFail({ where: { id: product.id } });
    expect(reloadedProduct.stock).toBe(5);

    const orders = await dataSource.getRepository(ShopOrder).find();
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("CANCELLED");
  });

  it("refuse un panier vide", async () => {
    const { createOrder } = await import("./ShopOrderService");
    const { ForbiddenError } = await import("@/lib/errors");
    const { team } = await seedTeamWithProduct(dataSource);

    await expect(createOrder({ purchaserId: "user-1", teamId: team.id, items: [] })).rejects.toThrow(ForbiddenError);
  });
});

describe("reconcileOrderPayment (SQLite réel)", () => {
  it("marque PAID quand payment-api confirme le paiement", async () => {
    const { createOrder, reconcileOrderPayment } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });
    const { order } = await createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 1 }] });

    getPaymentStatus.mockResolvedValue("PAID");
    const result = await reconcileOrderPayment(order.paymentId!);

    expect(result).toBe("PAID");
    const reloaded = await dataSource.getRepository(ShopOrder).findOneOrFail({ where: { id: order.id } });
    expect(reloaded.status).toBe("PAID");
    expect(reloaded.paidAt).not.toBeNull();
  });

  it("annule et restocke quand payment-api renvoie FAILED", async () => {
    const { createOrder, reconcileOrderPayment } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });
    await createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 2 }] });

    getPaymentStatus.mockResolvedValue("FAILED");
    const result = await reconcileOrderPayment("pay_1");

    expect(result).toBe("CANCELLED");
    const reloadedProduct = await dataSource.getRepository(Product).findOneOrFail({ where: { id: product.id } });
    expect(reloadedProduct.stock).toBe(5);
  });

  it("reste PENDING tant que payment-api n'a pas de statut définitif", async () => {
    const { createOrder, reconcileOrderPayment } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });
    await createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 1 }] });

    getPaymentStatus.mockResolvedValue("PENDING");
    expect(await reconcileOrderPayment("pay_1")).toBe("PENDING");
  });

  it("est idempotent : ré-appeler sur une commande déjà PAID ne relit pas payment-api", async () => {
    const { createOrder, reconcileOrderPayment } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });
    await createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 1 }] });
    getPaymentStatus.mockResolvedValue("PAID");
    await reconcileOrderPayment("pay_1");

    getPaymentStatus.mockClear();
    expect(await reconcileOrderPayment("pay_1")).toBe("PAID");
    expect(getPaymentStatus).not.toHaveBeenCalled();
  });

  /** TASK-P0-016 : paiement confirmé tardivement après libération du stock. */
  it("détecte un paiement confirmé tardivement après libération du stock (PAID_STOCK_UNAVAILABLE)", async () => {
    const { createOrder, reconcileOrderPayment } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });
    await createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 2 }] });
    getPaymentStatus.mockResolvedValue("FAILED");
    await reconcileOrderPayment("pay_1"); // la commande passe CANCELLED, stock restocké

    // Le fournisseur confirme finalement le paiement, après coup.
    getPaymentStatus.mockResolvedValue("PAID");
    const result = await reconcileOrderPayment("pay_1");

    expect(result).toBe("PAID_STOCK_UNAVAILABLE");
  });

  it("une commande CANCELLED dont le paiement reste non confirmé reste CANCELLED", async () => {
    const { createOrder, reconcileOrderPayment } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });
    initPayment.mockResolvedValue({ paymentId: "pay_1", payUrl: "https://pay.example.com/pay_1" });
    await createOrder({ purchaserId: "user-1", teamId: team.id, items: [{ productId: product.id, quantity: 1 }] });
    getPaymentStatus.mockResolvedValue("FAILED");
    await reconcileOrderPayment("pay_1");

    getPaymentStatus.mockResolvedValue("EXPIRED");
    expect(await reconcileOrderPayment("pay_1")).toBe("CANCELLED");
  });
});

describe("purgeStaleOrders (SQLite réel)", () => {
  it("libère le stock des commandes PENDING abandonnées depuis plus de 30 minutes", async () => {
    const { purgeStaleOrders } = await import("./ShopOrderService");
    const { team, product } = await seedTeamWithProduct(dataSource, { stock: 5 });

    const orderRepo = dataSource.getRepository(ShopOrder);
    const { ShopOrderItem } = await import("@/entities/ShopOrderItem");
    const staleOrder = await orderRepo.save(
      orderRepo.create({
        teamId: team.id,
        purchaserId: "user-1",
        status: "PENDING",
        totalPrice: "40.000",
        paymentId: "pay_old",
      }),
    );
    await dataSource
      .getRepository(ShopOrder)
      .createQueryBuilder()
      .update()
      .set({ createdAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where("id = :id", { id: staleOrder.id })
      .execute();
    await dataSource.getRepository(ShopOrderItem).save(
      dataSource.getRepository(ShopOrderItem).create({
        orderId: staleOrder.id,
        productId: product.id,
        productNameFr: product.nameFr,
        unitPrice: product.price,
        quantity: 2,
        lineTotal: "40.000",
      }),
    );
    await dataSource.getRepository(Product).update({ id: product.id }, { stock: 3 });

    const result = await purgeStaleOrders();

    expect(result.releasedOrders).toBe(1);
    const reloadedProduct = await dataSource.getRepository(Product).findOneOrFail({ where: { id: product.id } });
    expect(reloadedProduct.stock).toBe(5);
    const reloadedOrder = await orderRepo.findOneOrFail({ where: { id: staleOrder.id } });
    expect(reloadedOrder.status).toBe("CANCELLED");
  });
});
