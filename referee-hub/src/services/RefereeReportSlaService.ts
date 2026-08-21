import { In } from "typeorm";
import { getDataSource } from "@/lib/db";
import { Assignment } from "@/entities/Assignment";
import { RefereeMatchReport } from "@/entities/RefereeMatchReport";
import { computeReportSlaSchedule, isReportMandatoryForRole, resolveReportSlaState } from "@/lib/reportPolicy";
import { RefereeReportPolicyService } from "./RefereeReportPolicyService";
import {
  buildWorkflowSlaEventId,
  type WorkflowSlaAlertStage,
  type WorkflowSlaState,
} from "../../../packages/domain-contracts/src/workflow-sla";
import { deliverNotification } from "../../../packages/notifications-client/src/index";

export interface RefereeReportSlaQueueItem {
  assignmentId: number;
  userId: string;
  matchId: string;
  state: WorkflowSlaState;
  scheduleStartedAt: Date;
}

function stageForState(state: WorkflowSlaState): WorkflowSlaAlertStage | null {
  if (state === "DUE_SOON" || state === "OVERDUE") return "REMINDER";
  if (state === "ESCALATION_DUE") return "ESCALATION";
  return null;
}

/**
 * REF-004 — file des rapports d'officiels obligatoires non encore envoyés,
 * dérivée de la policy (GOV-008 `workflow-sla`). N'englobe que
 * l'obligation initiale de dépôt (DRAFT/absent) ; un rapport déjà envoyé,
 * même en cours d'amendement, est considéré satisfait.
 */
export class RefereeReportSlaService {
  async buildQueue(at: Date = new Date()): Promise<RefereeReportSlaQueueItem[]> {
    const ds = await getDataSource();
    const policy = await new RefereeReportPolicyService().resolve(at);
    if (policy.mandatoryRoles.length === 0) return [];

    const assignments = await ds
      .getRepository(Assignment)
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.match", "match")
      .where("assignment.status = :status", { status: "ACTIVE" })
      .getMany();

    const eligible = assignments.filter(
      (assignment) => assignment.match?.status === "FINISHED" && assignment.match.date &&
        isReportMandatoryForRole(policy, assignment.role),
    );
    if (eligible.length === 0) return [];

    const reports = await ds.getRepository(RefereeMatchReport).find({
      where: { assignmentId: In(eligible.map((assignment) => assignment.id)) },
    });
    const reportByAssignment = new Map(reports.map((report) => [report.assignmentId, report]));

    const queue: RefereeReportSlaQueueItem[] = [];
    for (const assignment of eligible) {
      const report = reportByAssignment.get(assignment.id);
      if (report && report.status !== "DRAFT") continue; // SUBMITTED/AMENDED/AMENDMENT_REQUESTED already satisfied the obligation once
      const schedule = computeReportSlaSchedule(policy, assignment.match!.date!);
      const state = resolveReportSlaState(schedule, at);
      if (state === "IN_SLA") continue;
      queue.push({
        assignmentId: assignment.id,
        userId: assignment.userId,
        matchId: assignment.matchId,
        state,
        scheduleStartedAt: schedule.startedAt,
      });
    }
    return queue;
  }

  private async claim(
    item: RefereeReportSlaQueueItem,
    stage: WorkflowSlaAlertStage,
  ): Promise<{ claimed: boolean; eventId: string }> {
    const eventId = buildWorkflowSlaEventId({
      domain: "REFEREE_REPORT",
      entityId: String(item.assignmentId),
      stage,
      cycleStartedAt: item.scheduleStartedAt,
    });
    const ds = await getDataSource();
    const claimed = await ds.transaction(async (manager) => {
      await manager.query(
        `INSERT IGNORE INTO referee_report_sla_alerts (event_id, assignment_id, stage, status, attempts, created_at, updated_at)
         VALUES (?, ?, ?, 'PENDING', 0, NOW(), NOW())`,
        [eventId, item.assignmentId, stage],
      );
      const result = (await manager.query(
        `UPDATE referee_report_sla_alerts
            SET status = 'PENDING', locked_at = NOW(), attempts = attempts + 1, last_error = NULL
          WHERE event_id = ?
            AND (status = 'PENDING' AND (locked_at IS NULL OR locked_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)))`,
        [eventId],
      )) as { affectedRows?: number };
      return Number(result?.affectedRows ?? 0) === 1;
    });
    return { claimed, eventId };
  }

  private async complete(eventId: string, error?: unknown): Promise<void> {
    const ds = await getDataSource();
    if (!error) {
      await ds.query(
        `UPDATE referee_report_sla_alerts SET status = 'SENT', locked_at = NULL, last_error = NULL WHERE event_id = ?`,
        [eventId],
      );
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    await ds.query(
      `UPDATE referee_report_sla_alerts SET locked_at = NULL, last_error = ? WHERE event_id = ?`,
      [message.slice(0, 500), eventId],
    );
  }

  /** GOV-008 : traitement idempotent, un rappel puis une escalade FEDERATION_ADMIN si toujours en retard. */
  async processReminders(at: Date = new Date()): Promise<{ examined: number; sent: number; failed: number }> {
    const queue = await this.buildQueue(at);
    let sent = 0;
    let failed = 0;
    for (const item of queue) {
      const stage = stageForState(item.state);
      if (!stage) continue;
      const { claimed, eventId } = await this.claim(item, stage);
      if (!claimed) continue;
      try {
        if (stage === "REMINDER") {
          await deliverNotification({
            eventId,
            type: "REFEREE_REPORT_DUE",
            userId: item.userId,
            category: "REFEREE_REPORT",
            title: "Rapport d'officiel à envoyer",
            body: "Un rapport d'officiel obligatoire n'a pas encore été envoyé pour un match récent.",
            data: { assignmentId: item.assignmentId, matchId: item.matchId },
          });
        } else {
          await deliverNotification({
            eventId,
            type: "REFEREE_REPORT_OVERDUE_ESCALATION",
            target: { type: "ROLE", role: "FEDERATION_ADMIN" },
            category: "REFEREE_REPORT",
            title: "Rapport d'officiel en retard",
            body: "Un rapport d'officiel obligatoire est en retard au-delà du délai d'escalade.",
            data: { assignmentId: item.assignmentId, matchId: item.matchId, userId: item.userId },
          });
        }
        await this.complete(eventId);
        sent += 1;
      } catch (error) {
        await this.complete(eventId, error);
        failed += 1;
      }
    }
    return { examined: queue.length, sent, failed };
  }
}
