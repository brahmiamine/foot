import { getObTeam } from "@/lib/ob-team";
import { getSessionMember } from "@/lib/community/member";
import { TicketPurchaseService } from "@/services/TicketPurchaseService";
import { PageChrome } from "@/components/PageChrome";
import { TicketList } from "./TicketList";
import { GuestLookupForm } from "./GuestLookupForm";
import { resolveTicketDisplayInfo } from "./ticketDisplay";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mes billets — Olympique de Béja",
};

export default async function MesBilletsPage() {
  const team = await getObTeam();
  const sessionMember = await getSessionMember();

  const tickets =
    team && sessionMember ? await resolveTicketDisplayInfo(await new TicketPurchaseService().getTicketsForUser(sessionMember.session.id, team.id), team.id) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container} style={{ maxWidth: 640 }}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Mes billets
          </h1>

          {sessionMember ? (
            tickets.length === 0 ? (
              <p className={shared.empty}>Vous n&apos;avez pas encore de billet. Rendez-vous sur la billetterie pour réserver vos places.</p>
            ) : (
              <TicketList tickets={tickets} />
            )
          ) : (
            <>
              <p className={shared.sectionSubtitle} style={{ marginBottom: 24, display: "block" }}>
                Retrouvez vos billets grâce au numéro de commande reçu à la réservation et à votre email.
              </p>
              <GuestLookupForm />
            </>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
