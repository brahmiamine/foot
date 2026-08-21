import Link from "next/link";
import { notFound } from "next/navigation";
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiFileText, FiSave, FiSend } from "react-icons/fi";
import { PageHeading } from "@/components/PageHeading";
import type { AssignmentRole } from "@/entities/Assignment";
import { formatDate, roleLabel } from "@/lib/assignmentView";
import { getLocale, localize } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { ReportService } from "@/services/ReportService";
import { requestAmendmentAction, saveReportAction } from "../actions";

function reportTitle(role: AssignmentRole, locale: "fr" | "ar") {
  if (role === "MATCH_DELEGATE") return locale === "ar" ? "تقرير مراقب المباراة" : "Rapport du commissaire de match";
  if (role === "REFEREE_OBSERVER") return locale === "ar" ? "تقرير مراقب الحكام" : "Rapport de l'observateur d'arbitres";
  return locale === "ar" ? "تقرير تكميلي" : "Rapport complémentaire";
}

const CATEGORY_LABELS = {
  GENERAL: { fr: "Général", ar: "عام" },
  SECURITY: { fr: "Sécurité", ar: "الأمن" },
  ORGANIZATION: { fr: "Organisation", ar: "التنظيم" },
  DISCIPLINE: { fr: "Discipline", ar: "الانضباط" },
  TECHNICAL: { fr: "Technique", ar: "فني" },
  OTHER: { fr: "Autre", ar: "أخرى" },
} as const;

export default async function ReportEditorPage({ params, searchParams }: { params: Promise<{ assignmentId: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const [session, locale, route, query] = await Promise.all([requireRequestSession(), getLocale(), params, searchParams]);
  const assignmentId = Number.parseInt(route.assignmentId, 10);
  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) notFound();
  let context;
  try { context = await new ReportService().getContext(session.id, assignmentId); } catch { notFound(); }
  const { assignment, report } = context;
  const match = assignment.match!;
  const locked = report?.status === "SUBMITTED" || report?.status === "AMENDED";
  const editable = !report || report.status === "DRAFT" || report.status === "AMENDMENT_REQUESTED";
  const fixture = `${localize(locale, match.homeTeam?.name, match.homeTeam?.nameAr)} — ${localize(locale, match.awayTeam?.name, match.awayTeam?.nameAr)}`;
  const title = reportTitle(assignment.role, locale);

  return <>
    <Link href="/reports" className="back-link"><FiArrowLeft />{locale === "ar" ? "العودة إلى التقارير" : "Retour aux rapports"}</Link>
    <PageHeading title={title} description={`${fixture} · ${formatDate(match.date, locale)} · ${roleLabel(assignment.role, locale)}`} />
    {query.error && <div className="feedback-banner error"><FiAlertCircle />{query.error}</div>}
    {query.success && <div className="feedback-banner success"><FiCheckCircle />{query.success === "submitted" ? (locale === "ar" ? "تم إرسال التقرير إلى الجامعة." : "Le rapport a été envoyé à la fédération.") : (locale === "ar" ? "تم حفظ المسودة." : "Le brouillon a été enregistré.")}</div>}
    {report?.status === "AMENDMENT_REQUESTED" && report.amendmentReason && (
      <div className="feedback-banner"><FiAlertCircle />{locale === "ar" ? "طلب تعديل: " : "Amendement demandé : "}{report.amendmentReason}</div>
    )}
    <section className="panel-card report-editor">
      <div className="panel-title"><FiFileText /><div><span>{locked ? (locale === "ar" ? "تم الإرسال" : "Rapport envoyé") : (locale === "ar" ? "مسودة خاصة" : "Brouillon privé")}</span><h2>{fixture}</h2></div></div>
      <form action={saveReportAction} className="portal-form">
        <input type="hidden" name="assignment_id" value={assignment.id} />
        <label>{locale === "ar" ? "تصنيف التقرير" : "Catégorie"}<select name="category" defaultValue={report?.category ?? "GENERAL"} disabled={!editable}>{Object.entries(CATEGORY_LABELS).map(([value, labels]) => <option key={value} value={value}>{labels[locale]}</option>)}</select></label>
        <label className="full-field">{locale === "ar" ? "الموضوع" : "Objet"}<input name="subject" maxLength={180} required defaultValue={report?.subject ?? ""} disabled={!editable} /></label>
        <label className="full-field">{locale === "ar" ? "محتوى التقرير" : "Contenu du rapport"}<textarea name="content" rows={14} required defaultValue={report?.content ?? ""} disabled={!editable} placeholder={locale === "ar" ? "صف الوقائع أو الحوادث أو الملاحظات…" : "Décrivez les faits, incidents ou observations…"} /></label>
        {editable && <div className="form-actions"><button className="secondary-action" name="intent" value="draft" type="submit"><FiSave />{locale === "ar" ? "حفظ المسودة" : "Enregistrer le brouillon"}</button><button className="primary-action" name="intent" value="submit" type="submit"><FiSend />{report?.status === "AMENDMENT_REQUESTED" ? (locale === "ar" ? "إرسال التعديل" : "Envoyer la correction") : (locale === "ar" ? "إرسال إلى الجامعة" : "Envoyer à la fédération")}</button></div>}
        {!editable && <p className="locked-note"><FiCheckCircle />{locale === "ar" ? "هذا التقرير نهائي ولم يعد قابلاً للتعديل." : "Ce rapport est définitif et n’est plus modifiable."}</p>}
      </form>
      {locked && (
        <form action={requestAmendmentAction} className="portal-form" style={{ marginTop: 16 }}>
          <input type="hidden" name="assignment_id" value={assignment.id} />
          <label className="full-field">
            {locale === "ar" ? "طلب تعديل (سبب إلزامي)" : "Demander un amendement (motif obligatoire)"}
            <textarea name="amendment_reason" minLength={5} maxLength={500} rows={2} required placeholder={locale === "ar" ? "اشرح سبب طلب التعديل" : "Expliquez le motif de la correction"} />
          </label>
          <button type="submit" className="secondary-action">{locale === "ar" ? "طلب تعديل" : "Demander un amendement"}</button>
        </form>
      )}
    </section>
  </>;
}
