import { getDataSource } from "@/lib/database";
import { FeePlan } from "@/entities/FeePlan";
import { PlayerFee, PlayerFeeStatus } from "@/entities/PlayerFee";
import { Payment, PaymentMethod } from "@/entities/Payment";
import { Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";

export interface PlayerFeeWithBalance extends PlayerFee {
  totalPaid: number;
  balance: number;
}

/**
 * Service for club dues/payments (TND) — modèles de cotisation
 * (`cms_fee_plans`), cotisations assignées aux joueurs (`cms_player_fees`)
 * et versements (`cms_payments`). Le statut d'une cotisation est recalculé
 * à chaque paiement enregistré/supprimé, jamais fixé manuellement (sauf
 * exonération "WAIVED").
 */
export class FinanceService {
  private async getFeePlanRepository(): Promise<Repository<FeePlan>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(FeePlan);
  }

  private async getPlayerFeeRepository(): Promise<Repository<PlayerFee>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PlayerFee);
  }

  private async getPaymentRepository(): Promise<Repository<Payment>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Payment);
  }

  // ---- Fee plans ------------------------------------------------------

  async findAllPlans(teamId: string): Promise<FeePlan[]> {
    const repository = await this.getFeePlanRepository();
    return repository.find({ where: { teamId }, relations: ["season"], order: { createdAt: "DESC" } });
  }

  async createPlan(
    data: { name: string; amount: string; seasonId?: number | null; category?: AgeCategory | null; description?: string | null },
    teamId: string
  ): Promise<FeePlan> {
    const repository = await this.getFeePlanRepository();
    const plan = repository.create({ ...data, teamId });
    return repository.save(plan);
  }

  async deletePlan(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getFeePlanRepository();
    const plan = await repository.findOne({ where: { id, teamId } });
    if (!plan) throw new Error("Modèle de cotisation non trouvé");
    await repository.remove(plan);
    return true;
  }

  // ---- Player fees ------------------------------------------------------

  async findAllFees(teamId: string): Promise<PlayerFeeWithBalance[]> {
    const repository = await this.getPlayerFeeRepository();
    const fees = await repository.find({ where: { teamId }, relations: ["player", "feePlan"], order: { createdAt: "DESC" } });
    return this.withBalances(fees);
  }

  async findFeeById(id: number, teamId: string): Promise<PlayerFee | null> {
    const repository = await this.getPlayerFeeRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  private async withBalances(fees: PlayerFee[]): Promise<PlayerFeeWithBalance[]> {
    const paymentRepository = await this.getPaymentRepository();
    const result: PlayerFeeWithBalance[] = [];
    for (const fee of fees) {
      const payments = await paymentRepository.find({ where: { playerFeeId: fee.id } });
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      result.push({ ...fee, totalPaid, balance: Number(fee.amountDue) - totalPaid });
    }
    return result;
  }

  async assignFee(
    data: { playerId: string; feePlanId?: number | null; label: string; amountDue: string; dueDate?: string | null },
    teamId: string
  ): Promise<PlayerFee> {
    const repository = await this.getPlayerFeeRepository();
    const fee = repository.create({ ...data, teamId, status: "PENDING" });
    return repository.save(fee);
  }

  async setWaived(id: number, teamId: string): Promise<PlayerFee> {
    const repository = await this.getPlayerFeeRepository();
    const fee = await this.findFeeById(id, teamId);
    if (!fee) throw new Error("Cotisation non trouvée");
    fee.status = "WAIVED";
    return repository.save(fee);
  }

  async deleteFee(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getPlayerFeeRepository();
    const fee = await this.findFeeById(id, teamId);
    if (!fee) throw new Error("Cotisation non trouvée");
    await repository.remove(fee);
    return true;
  }

  // ---- Payments -----------------------------------------------------

  async findPaymentsForFee(playerFeeId: number): Promise<Payment[]> {
    const repository = await this.getPaymentRepository();
    return repository.find({ where: { playerFeeId }, order: { paidAt: "DESC" } });
  }

  async recordPayment(
    playerFeeId: number,
    teamId: string,
    data: { amount: string; method?: PaymentMethod; paidAt?: Date; notes?: string | null },
    recordedBy: string | null
  ): Promise<Payment> {
    const fee = await this.findFeeById(playerFeeId, teamId);
    if (!fee) throw new Error("Cotisation non trouvée");
    if (fee.status === "WAIVED") throw new Error("Cette cotisation est exonérée, aucun paiement à enregistrer");

    const repository = await this.getPaymentRepository();
    const payment = repository.create({ playerFeeId, amount: data.amount, method: data.method ?? "CASH", paidAt: data.paidAt ?? new Date(), notes: data.notes ?? null, recordedBy });
    await repository.save(payment);

    await this.recalculateStatus(fee);
    return payment;
  }

  async deletePayment(id: number, playerFeeId: number, teamId: string): Promise<boolean> {
    const fee = await this.findFeeById(playerFeeId, teamId);
    if (!fee) throw new Error("Cotisation non trouvée");

    const repository = await this.getPaymentRepository();
    const payment = await repository.findOne({ where: { id, playerFeeId } });
    if (!payment) throw new Error("Paiement non trouvé");
    await repository.remove(payment);

    await this.recalculateStatus(fee);
    return true;
  }

  private async recalculateStatus(fee: PlayerFee): Promise<void> {
    if (fee.status === "WAIVED") return;
    const paymentRepository = await this.getPaymentRepository();
    const payments = await paymentRepository.find({ where: { playerFeeId: fee.id } });
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    let status: PlayerFeeStatus = "PENDING";
    if (totalPaid >= Number(fee.amountDue)) status = "PAID";
    else if (totalPaid > 0) status = "PARTIAL";

    const feeRepository = await this.getPlayerFeeRepository();
    await feeRepository.update({ id: fee.id }, { status });
  }
}
