import { In } from "typeorm";
import { RefereeMatchReport, type RefereeMatchReportCategory } from "@/entities/RefereeMatchReport";
import { getDataSource } from "@/lib/db";
import { canWriteMatchReport, reportTypeForRole } from "@/lib/refereeRules";
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
    return assignments.map((assignment) => ({ assignment, report: byAssignment.get(assignment.id) ?? null }));
  }

  async getContext(userId: string, assignmentId: number) {
    const assignment = await new AssignmentService().getMine(userId, assignmentId);
    if (!assignment?.match || !canWriteMatchReport(assignment.role, assignment.status, assignment.match.status)) {
      throw new ReportError("Ce match n’est pas éligible à un rapport d'officiel");
    }
    const report = await (await this.repository()).findOne({ where: { assignmentId, userId } });
    return { assignment, report };
  }

  async saveMine(
    userId: string,
    assignmentId: number,
    subject: string,
    content: string,
    category: string,
    submit: boolean,
  ): Promise<RefereeMatchReport> {
    const { assignment, report } = await this.getContext(userId, assignmentId);
    if (report?.status === "SUBMITTED") throw new ReportError("Ce rapport a déjà été envoyé");

    const reportType = reportTypeForRole(assignment.role);
    if (!reportType) throw new ReportError("Cette fonction officielle ne peut pas déposer de rapport");

    const cleanSubject = subject.trim();
    const cleanContent = content.trim();
    const cleanCategory = category.trim().toUpperCase() as RefereeMatchReportCategory;
    if (!cleanSubject || cleanSubject.length > 180) throw new ReportError("L’objet du rapport est requis (180 caractères maximum)");
    if (!cleanContent) throw new ReportError("Le contenu du rapport est requis");
    if (!REPORT_CATEGORIES.has(cleanCategory)) throw new ReportError("Catégorie de rapport invalide");
    if (submit && cleanContent.length < 30) throw new ReportError("Le rapport doit contenir au moins 30 caractères avant envoi");

    const repo = await this.repository();
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
    entity.status = submit ? "SUBMITTED" : "DRAFT";
    entity.submittedAt = submit ? new Date() : null;
    return repo.save(entity);
  }
}
