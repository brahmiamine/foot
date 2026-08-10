import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { FinanceService } from "@/services/FinanceService";
import { SeasonService } from "@/services/SeasonService";
import { PlayerService } from "@/services/PlayerService";
import { FinanceManagement } from "./FinanceManagement";

export const dynamic = "force-dynamic";

/** Page Cotisations & paiements — cotisations du club (TND), assignées aux joueurs, réglées en un ou plusieurs versements. */
export default async function FinancePage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const financeService = new FinanceService();
  const seasonService = new SeasonService();
  const playerService = new PlayerService();

  const [plansData, feesData, seasonsData, playersData] = await Promise.all([
    financeService.findAllPlans(teamId),
    financeService.findAllFees(teamId),
    seasonService.findAll(teamId),
    playerService.findAll(teamId, access.categories),
  ]);

  const plans = plansData.map((p) => ({
    id: p.id,
    name: p.name,
    amount: p.amount,
    seasonName: p.season?.name ?? null,
    category: p.category ?? null,
    description: p.description ?? null,
  }));

  const fees = await Promise.all(
    feesData.map(async (f) => {
      const payments = await financeService.findPaymentsForFee(f.id);
      return {
        id: f.id,
        playerId: f.playerId,
        playerName: f.player ? `${f.player.firstNameFr} ${f.player.lastNameFr}` : "Joueur inconnu",
        feePlanName: f.feePlan?.name ?? null,
        label: f.label,
        amountDue: f.amountDue,
        dueDate: f.dueDate ?? null,
        status: f.status,
        totalPaid: f.totalPaid,
        balance: f.balance,
        payments: payments.map((pay) => ({
          id: pay.id,
          amount: pay.amount,
          method: pay.method,
          paidAt: pay.paidAt.toISOString(),
          notes: pay.notes ?? null,
        })),
      };
    })
  );

  const seasons = seasonsData.map((s) => ({ id: s.id, name: s.name }));
  const players = playersData.map((p) => ({ id: p.id, label: `${p.firstNameFr} ${p.lastNameFr}` }));

  return (
    <FinanceManagement
      initialPlans={plans}
      initialFees={fees}
      seasons={seasons}
      players={players}
      canManage={can(access, "finance.manage")}
    />
  );
}
