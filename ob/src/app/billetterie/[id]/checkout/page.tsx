import { notFound } from "next/navigation";
import { getObTeam } from "@/lib/ob-team";
import { getSsoSession } from "@/lib/ssoSession";
import { TicketingService } from "@/services/TicketingService";
import { TicketPurchaseService } from "@/services/TicketPurchaseService";
import { formatMatchDateTime } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import { CheckoutClient } from "./CheckoutClient";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { id: idParam } = await params;
  const { order: orderParam } = await searchParams;
  const ticketingEventId = parseInt(idParam, 10);
  const orderId = orderParam ? parseInt(orderParam, 10) : NaN;
  if (Number.isNaN(ticketingEventId) || Number.isNaN(orderId)) notFound();

  const team = await getObTeam();
  if (!team) notFound();

  const purchaseService = new TicketPurchaseService();
  const order = await purchaseService.getOrder(orderId, team.id);
  if (!order || order.ticketingEventId !== ticketingEventId) notFound();

  if (order.status !== "PENDING") {
    return (
      <PageChrome>
        <div className={shared.sectionPad}>
          <div className={shared.container} style={{ maxWidth: 560 }}>
            <p className={shared.empty}>
              {order.status === "CONFIRMED" ? "Cette commande a déjà été confirmée." : "Cette réservation a expiré, veuillez recommencer."}
            </p>
          </div>
        </div>
      </PageChrome>
    );
  }

  const [items, eventInfo, session] = await Promise.all([
    purchaseService.getOrderItems(orderId),
    new TicketingService().getEventById(ticketingEventId, team.id),
    getSsoSession(),
  ]);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container} style={{ maxWidth: 560 }}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 4 }}>
            Finaliser ma réservation
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 24, display: "block" }}>
            {eventInfo?.matchLabel} {eventInfo?.matchDate ? `· ${formatMatchDateTime(eventInfo.matchDate)}` : ""}
          </p>

          <CheckoutClient
            ticketingEventId={ticketingEventId}
            orderId={orderId}
            expiresAt={order.expiresAt ? order.expiresAt.toISOString() : null}
            items={items.map((i) => ({ categoryName: i.categoryName, quantity: i.quantity, unitPrice: parseFloat(i.unitPrice) }))}
            defaultFirstName={session?.name?.split(" ")[0] ?? ""}
            defaultLastName={session?.name?.split(" ").slice(1).join(" ") ?? ""}
            defaultEmail={session?.email ?? ""}
            loggedIn={!!session && session.role === "MEMBER"}
          />
        </div>
      </div>
    </PageChrome>
  );
}
