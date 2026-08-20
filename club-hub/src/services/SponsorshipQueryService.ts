import { getDataSource } from "@/lib/database";
import { SponsorContractApproval, SponsorContractDecision } from "@/entities/SponsorshipGovernance";
import { ClubFeatureSettingsService } from "./ClubFeatureSettingsService";

export interface SponsorApprovalSummary {
  id: string;
  sponsorId: number;
  makerUserId: string;
  approvalMode: "SINGLE_APPROVAL" | "DUAL_APPROVAL";
  requiredApprovals: number;
  approvalCount: number;
  contractAmount: number;
  thresholdSnapshot: number;
  createdAt: Date;
}

export class SponsorshipQueryService {
  private async assertEnabled(teamId: string): Promise<void> {
    await new ClubFeatureSettingsService().assertEnabled(teamId, "SPONSORING");
  }

  async listPendingApprovals(teamId: string): Promise<SponsorApprovalSummary[]> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const approvals = await ds.getRepository(SponsorContractApproval).find({
      where: { teamId, status: "PENDING" },
      order: { createdAt: "ASC" },
    });
    if (approvals.length === 0) return [];

    const decisionRepo = ds.getRepository(SponsorContractDecision);
    return Promise.all(
      approvals.map(async (approval) => ({
        id: approval.id,
        sponsorId: approval.sponsorId,
        makerUserId: approval.makerUserId,
        approvalMode: approval.approvalMode,
        requiredApprovals: approval.requiredApprovals,
        approvalCount: await decisionRepo.count({
          where: { approvalId: approval.id, decision: "APPROVE" },
        }),
        contractAmount: Number(approval.contractAmountSnapshot),
        thresholdSnapshot: Number(approval.thresholdSnapshot),
        createdAt: approval.createdAt,
      })),
    );
  }
}
