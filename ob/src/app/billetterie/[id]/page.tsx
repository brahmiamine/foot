import { notFound } from "next/navigation";
import { getObTeam } from "@/lib/ob-team";
import { TicketingService } from "@/services/TicketingService";
import { formatMatchDateTime } from "@/lib/format";
import { PageChrome } from "@/components/PageChrome";
import { TicketSelector } from "./TicketSelector";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export default async function BilletterieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) notFound();

  const team = await getObTeam();
  if (!team) notFound();

  const service = new TicketingService();
  const eventInfo = await service.getEventById(id, team.id);
  if (!eventInfo || eventInfo.event.status !== "OPEN") notFound();

  const categories = await service.getAvailability(id);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container} style={{ maxWidth: 720 }}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 4 }}>
            {eventInfo.matchLabel}
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            {eventInfo.matchDate ? formatMatchDateTime(eventInfo.matchDate) : "Date à confirmer"}
          </p>

          {categories.length === 0 ? (
            <p className={shared.empty}>Aucune catégorie de billet disponible pour ce match.</p>
          ) : (
            <TicketSelector
              ticketingEventId={id}
              maxTicketsPerOrder={eventInfo.event.maxTicketsPerOrder}
              categories={categories}
            />
          )}
        </div>
      </div>
    </PageChrome>
  );
}
