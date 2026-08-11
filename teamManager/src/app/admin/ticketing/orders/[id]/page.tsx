import { notFound } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, requirePermission } from "@/lib/access";
import { TicketOrderService } from "@/services/TicketOrderService";
import { TicketCategoryService } from "@/services/TicketCategoryService";
import { OrderDetail } from "./OrderDetail";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) notFound();

  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.viewOrders");

  const orderService = new TicketOrderService();
  const order = await orderService.findById(id, teamId);
  if (!order) notFound();

  const [items, tickets, categoriesData] = await Promise.all([
    orderService.findItems(id),
    orderService.findTickets(id),
    new TicketCategoryService().findAll(teamId),
  ]);
  const categoryNameById = new Map(categoriesData.map((c) => [c.id, c.name]));

  return (
    <OrderDetail
      order={{
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone ?? null,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      }}
      items={items.map((i) => ({ id: i.id, categoryName: categoryNameById.get(i.ticketCategoryId) ?? "?", quantity: i.quantity, unitPrice: parseFloat(i.unitPrice) }))}
      tickets={tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        categoryName: categoryNameById.get(t.ticketCategoryId) ?? "?",
        holderName: [t.holderFirstName, t.holderLastName].filter(Boolean).join(" ") || "—",
        status: t.status,
      }))}
      canCancel={can(access, "ticketing.cancelTicket")}
    />
  );
}
