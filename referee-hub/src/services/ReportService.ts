import { In } from "typeorm";
import { RefereeMatchReport, type RefereeMatchReportCategory } from "@/entities/RefereeMatchReport";
import { RefereeConfigurationAudit } from "@/entities/RefereeConfigurationAudit";
import { getDataSource } from "@/lib/db";
import { canWriteMatchReport, reportTypeForRole } from "@/lib/refereeRules";
import { isReportMandatoryForRole } from "@/lib/reportPolicy";
import { RefereeReportPolicyService } from "./RefereeReportPolicyService";
import { AssignmentService } from "./AssignmentService";

export class ReportError extends Error {}

const REPORT_CATEGORIES = new Set<RefereeMatchReportCategory>([
  "GENERAL",
  "SECURITY",
  "ORGANIZATION",
  "DISCIPLINE",
  "TECHNICAL",
  "OTHER",
]);

export class ReportService {
  private async repository() {
    return (await getDataSource()).getRepository(RefereeMatchReport);
  }

  async listMine(userId: string) {
    const assignments = (await new AssignmentService().listMine(userId, "past"))
      .filter((assignment) => canWriteMatchReport(assignment.role, assignment.status, assignment.match?.status ?? ""));
    const assignmentIds = assignments.map((assignment) => assignment.id);
    const reports = assignmentIds.length
      ? await (await this.repository()).find({ where: { userId, assignmentId: In(assignmentIds) } })
      : [];
    const byAssignment = new Map(reports.map((report) => [report.assignmentId, report]));
    const policy = await new RefereeReportPolicyService().resolve();
    return assignments.map((assignment) => ({
      assignment,
      report: byAssignment.get(assignment.id) ?? null,
      mandatory: isReportMandatoryForRole(policy, assignment.role),
    }));
  }

  async getContext(userId: string, assignmentId: number) {
    const assignment = await new AssignmentService().getMine(userId, assignmentId);
    if (!assignment?.match || !canWriteMatchReport(assignment.role, assignment.status, assignment.match.status)) {
      throw new ReportError("Ce match n’est pas éligible à un rapport d'officiel");
    }
    const report = await (await this.repository()).findOne({ where: { assignmentId, userId } });
    const policy = await new RefereeReportPolicyService().resolve();
    return { assignment, report, mandatory: isReportMandatoryForRole(policy, assignment.role) };
  }

  /**
   * REF-004 — une fois `SUBMITTED`, le contenu ne peut plus être modifié
   * silencieusement : `requestAmendment` est requis avant tout nouvel envoi
   * (`AMENDMENT_REQUESTED` -> `AMENDED`, jamais retour à `SUBMITTED`).
   */
  async saveMine(
    userId: string,
    assignmentId: number,
    subject: string,
    content: string,
    category: string,
    submit: boolean,
  ): Promise<RefereeMatchReport> {
    const { assignment, report } = await this.getContext(userId, assignmentId);
    if (report?.status === "SUBMITTED" || report?.status === "AMENDED") {
      throw new ReportError("Ce rapport a déjà été envoyé : demandez un amendement pour le corriger");
    }

    const reportType = reportTypeForRole(assignment.role);
    if (!reportType) throw new ReportError("Cette fonction officielle ne peut pas déposer de rapport");

    const cleanSubject = subject.trim();
    const cleanContent = content.trim();
    const cleanCategory = category.trim().toUpperCase() as RefereeMatchReportCategory;
    if (!cleanSubject || cleanSubject.length > 180) throw new ReportError("L’objet du rapport est requis (180 caractères maximum)");
    if (!cleanContent) throw new ReportError("Le contenu du rapport est requis");
    if (!REPORT_CATEGORIES.has(cleanCategory)) throw new ReportError("Catégorie de rapport invalide");
    if (submit && cleanContent.length < 30) throw new ReportError("Le rapport doit contenir au moins 30 caractères avant envoi");

    const wasAmendmentRequested = report?.status === "AMENDMENT_REQUESTED";
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repo = manager.getRepository(RefereeMatchReport);
      const before = report ? { subject: report.subject, content: report.content, status: report.status } : null;
      const entity = report ?? repo.create({
        assignmentId: assignment.id,
        matchId: assignment.matchId,
        userId,
        role: assignment.role,
      });
      entity.reportType = reportType;
      entity.subject = cleanSubject;
      entity.category = cleanCategory;
      entity.content = cleanContent;
      if (submit) {
        entity.status = wasAmendmentRequested ? "AMENDED" : "SUBMITTED";
        entity.submittedAt = new Date();
        if (wasAmendmentRequested) {
          entity.amendedAt = new Date();
          entity.amendmentCount = (report?.amendmentCount ?? 0) + 1;
        }
      } else {
        entity.status = "DRAFT";
        entity.submittedAt = null;
      }
      const saved = await repo.save(entity);

      if (wasAmendmentRequested && submit) {
        await manager.getRepository(RefereeConfigurationAudit).save(
          manager.getRepository(RefereeConfigurationAudit).create({
            domain: "REFEREE_REPORT_AMENDMENT",
            configurationKey: `assignment:${assignmentId}`,
            scopeType: "ASSIGNMENT",
            scopeId: String(assignmentId),
            previousVersion: null,
            newVersion: null,
            before,
            after: { subject: saved.subject, content: saved.content, status: saved.status },
            actorUserId: userId,
            actorRole: assignment.role,
            reason: saved.amendmentReason ?? "Correction suite à demande d'amendement",
            ipAddress: null,
            userAgent: null,
          }),
        );
      }

      return saved;
    });
  }

  /** REF-004 — demande explicite d'amendement d'un rapport déjà envoyé, motif obligatoire. */
  async requestAmendment(userId: string, assignmentId: number, reason: string): Promise<RefereeMatchReport> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) throw new ReportError("Un motif d'amendement est obligatoire");
    const { report } = await this.getContext(userId, assignmentId);
    if (!report || (report.status !== "SUBMITTED" && report.status !== "AMENDED")) {
      throw new ReportError("Seul un rapport déjà envoyé peut faire l'objet d'une demande d'amendement");
    }
    const repo = await this.repository();
    report.status = "AMENDMENT_REQUESTED";
    report.amendmentReason = normalizedReason;
    report.amendmentRequestedAt = new Date();
    return repo.save(report);
  }
}
