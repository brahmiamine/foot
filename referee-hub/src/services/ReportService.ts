import { In } from "typeorm";
import { RefereeMatchReport } from "@/entities/RefereeMatchReport";
import { getDataSource } from "@/lib/db";
import { canWriteMatchReport } from "@/lib/refereeRules";
import { AssignmentService } from "./AssignmentService";

export class ReportError extends Error {}

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
      throw new ReportError("Ce match n’est pas éligible à un rapport complémentaire");
    }
    const report = await (await this.repository()).findOne({ where: { assignmentId, userId } });
    return { assignment, report };
  }

  async saveMine(userId: string, assignmentId: number, subject: string, content: string, submit: boolean): Promise<RefereeMatchReport> {
    const { assignment, report } = await this.getContext(userId, assignmentId);
    if (report?.status === "SUBMITTED") throw new ReportError("Ce rapport a déjà été envoyé");
    const cleanSubject = subject.trim();
    const cleanContent = content.trim();
    if (!cleanSubject || cleanSubject.length > 180) throw new ReportError("L’objet du rapport est requis (180 caractères maximum)");
    if (!cleanContent) throw new ReportError("Le contenu du rapport est requis");
    if (submit && cleanContent.length < 30) throw new ReportError("Le rapport doit contenir au moins 30 caractères avant envoi");
    const repo = await this.repository();
    const entity = report ?? repo.create({
      assignmentId: assignment.id,
      matchId: assignment.matchId,
      userId,
      role: assignment.role,
    });
    entity.subject = cleanSubject;
    entity.content = cleanContent;
    entity.status = submit ? "SUBMITTED" : "DRAFT";
    entity.submittedAt = submit ? new Date() : null;
    return repo.save(entity);
  }
}
