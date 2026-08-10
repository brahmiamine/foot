import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { ShopOrderService } from "@/services/ShopOrderService";
import { ProductService } from "@/services/ProductService";
import { OrdersManagement } from "./OrdersManagement";

export const dynamic = "force-dynamic";

/** Page Commandes boutique — commandes passées sur le catalogue (`cms_products`), jusqu'ici sans commande/paiement. */
export default async function OrdersPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const orderService = new ShopOrderService();
  const productService = new ProductService();

  const [ordersData, productsData] = await Promise.all([orderService.findAll(teamId), productService.findAll(teamId)]);

  const orders = await Promise.all(
    ordersData.map(async (o) => {
      const items = await orderService.findItems(o.id);
      return {
        id: o.id,
        customerName: o.user?.name ?? o.customerName ?? "Client",
        customerPhone: o.customerPhone ?? null,
        status: o.status,
        totalAmount: o.totalAmount,
        notes: o.notes ?? null,
        createdAt: o.createdAt.toISOString(),
        items: items.map((i) => ({ id: i.id, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
      };
    })
  );

  const products = productsData.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.nameFr, price: p.price, stock: p.stock }));

  return <OrdersManagement initialOrders={orders} products={products} canManage={can(access, "orders.manage")} />;
}
