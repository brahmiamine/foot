import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Trip } from "@/entities/Trip";
import {
  TripBudgetApproval,
  TripBudgetDecision,
  TripExpenseReceipt,
  TripWorkflowEvent,
} from "@/entities/TripGovernance";

export interface TripApprovalSummary {
  id: string;
  tripId: number;
  makerUserId: string;
  approvalMode: "SINGLE_APPROVAL" | "DUAL_APPROVAL";
  requiredApprovals: number;
  collectedApprovals: number;
  estimatedBudget: number;
  threshold: number;
  createdAt: Date;
}

export class TripGovernanceQueryService {
  async listPendingApprovals(teamId: string, tripIds: number[]): Promise<TripApprovalSummary[]> {
    if (tripIds.length === 0) return [];
    const ds = await getDataSource();
    const approvals = await ds.getRepository(TripBudgetApproval).find({
      where: { teamId, tripId: In(tripIds), status: "PENDING" },
      order: { createdAt: "ASC" },
    });
    if (approvals.length === 0) return [];
    const decisions = await ds.getRepository(TripBudgetDecision).find({
      where: { approvalId: In(approvals.map((approval) => approval.id)), decision: "APPROVE" },
    });
    const counts = new Map<string, number>();
    for (const decision of decisions) {
      counts.set(decision.approvalId, (counts.get(decision.approvalId) ?? 0) + 1);
    }
    return approvals.map((approval) => ({
      id: approval.id,
      tripId: approval.tripId,
      makerUserId: approval.makerUserId,
      approvalMode: approval.approvalMode,
      requiredApprovals: approval.requiredApprovals,
      collectedApprovals: counts.get(approval.id) ?? 0,
      estimatedBudget: Number(approval.estimatedBudgetSnapshot),
      threshold: Number(approval.thresholdSnapshot),
      createdAt: approval.createdAt,
    }));
  }

  async findApprovalTrip(approvalId: string, teamId: string): Promise<{ approval: TripBudgetApproval; trip: Trip } | null> {
    const ds = await getDataSource();
    const approval = await ds.getRepository(TripBudgetApproval).findOne({ where: { id: approvalId, teamId } });
    if (!approval) return null;
    const trip = await ds.getRepository(Trip).findOne({ where: { id: approval.tripId, teamId } });
    if (!trip) return null;
    return { approval, trip };
  }

  async listExpenses(teamId: string, tripIds: number[]): Promise<TripExpenseReceipt[]> {
    if (tripIds.length === 0) return [];
    const ds = await getDataSource();
    return ds.getRepository(TripExpenseReceipt).find({
      where: { teamId, tripId: In(tripIds) },
      order: { createdAt: "ASC" },
    });
  }

  async listEvents(teamId: string, tripIds: number[]): Promise<TripWorkflowEvent[]> {
    if (tripIds.length === 0) return [];
    const ds = await getDataSource();
    return ds.getRepository(TripWorkflowEvent).find({
      where: { teamId, tripId: In(tripIds) },
      order: { createdAt: "DESC" },
      take: 200,
    });
  }
}
