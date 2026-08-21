import { FiAlertCircle, FiCalendar, FiCheckCircle, FiSlash } from "react-icons/fi";
import { PageHeading } from "@/components/PageHeading";
import { formatDate } from "@/lib/assignmentView";
import { getLocale } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { AvailabilityService } from "@/services/AvailabilityService";
import { RefereeUnavailabilityPolicyService } from "@/services/RefereeUnavailabilityPolicyService";
import { cancelUnavailabilityAction, createUnavailabilityAction } from "./actions";

const REASON_LABELS: Record<string, { fr: string; ar: string }> = {
  MEDICAL: { fr: "Médical", ar: "طبي" },
  PROFESSIONAL: { fr: "Professionnel", ar: "مهني" },
  PERSONAL: { fr: "Personnel", ar: "شخصي" },
  OTHER: { fr: "Autre", ar: "آخر" },
};

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const [session, locale, query] = await Promise.all([requireRequestSession(), getLocale(), searchParams]);
  const [periods, policy] = await Promise.all([
    new AvailabilityService().listMine(session.id),
    new RefereeUnavailabilityPolicyService().resolve(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeading title={locale === "ar" ? "عدم التوفر" : "Mes indisponibilités"} description={locale === "ar" ? "أعلن الفترات التي لا يمكن تعيينك خلالها." : "Déclarez les périodes pendant lesquelles vous ne pouvez pas être désigné."} />
      {query.error && <div className="feedback-banner error"><FiAlertCircle />{query.error}</div>}
      {query.success && <div className="feedback-banner success"><FiCheckCircle />{locale === "ar" ? "تم تحديث فترة عدم التوفر." : "Votre indisponibilité a été mise à jour."}</div>}

      <div className="detail-columns availability-layout">
        <section className="panel-card">
          <div className="panel-title"><FiSlash /><div><span>{locale === "ar" ? "فترة جديدة" : "Nouvelle période"}</span><h2>{locale === "ar" ? "إضافة عدم توفر" : "Ajouter une indisponibilité"}</h2></div></div>
          <p className="field-hint">
            {locale === "ar"
              ? `مهلة ${policy.noticeMinHours} ساعة على الأقل، ${policy.maxDurationDays} يومًا كحد أقصى.`
              : `Préavis minimal de ${policy.noticeMinHours} h, durée maximale de ${policy.maxDurationDays} jours.`}
          </p>
          <form action={createUnavailabilityAction} className="portal-form">
            <label>{locale === "ar" ? "من" : "Du"}<input name="start_date" type="date" min={today} required /></label>
            <label>{locale === "ar" ? "إلى" : "Au"}<input name="end_date" type="date" min={today} required /></label>
            <label>{locale === "ar" ? "نوع السبب" : "Catégorie de motif"}
              <select name="reason_category" defaultValue="OTHER">
                {Object.entries(REASON_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{locale === "ar" ? label.ar : label.fr}</option>
                ))}
              </select>
            </label>
            <label>{locale === "ar" ? "رابط المستند الثبوتي" : "Lien du justificatif"}
              <input name="proof_document_url" type="url" placeholder="https://…" />
            </label>
            <label className="full-field">{locale === "ar" ? "السبب (اختياري)" : "Motif (optionnel)"}<textarea name="reason" rows={4} maxLength={500} placeholder={locale === "ar" ? "تكوين، التزام شخصي…" : "Formation, engagement personnel…"} /></label>
            {policy.recurrenceAllowed && (
              <fieldset className="full-field">
                <legend>{locale === "ar" ? "تكرار أسبوعي (اختياري)" : "Récurrence hebdomadaire (optionnel)"}</legend>
                <div className="checkbox-row">
                  {["dim", "lun", "mar", "mer", "jeu", "ven", "sam"].map((dayLabel, index) => (
                    <label key={index} className="checkbox-inline">
                      <input type="checkbox" name="recurrence_days_of_week" value={index} /> {dayLabel}
                    </label>
                  ))}
                </div>
                <label>{locale === "ar" ? "حتى تاريخ" : "Jusqu'au"}<input name="recurrence_end_date" type="date" min={today} /></label>
              </fieldset>
            )}
            <button className="primary-action" type="submit">{locale === "ar" ? "تسجيل" : "Enregistrer la période"}</button>
          </form>
        </section>

        <section className="panel-card">
          <div className="panel-title"><FiCalendar /><div><span>{locale === "ar" ? "التاريخ" : "Historique"}</span><h2>{locale === "ar" ? "الفترات المعلنة" : "Périodes déclarées"}</h2></div></div>
          <div className="period-list">
            {periods.map((period) => {
              const active = !period.cancelledAt && period.endDate >= today;
              const reasonLabel = REASON_LABELS[period.reasonCategory] ?? REASON_LABELS.OTHER;
              return <div key={period.id} className={active ? "period-item" : "period-item inactive"}>
                <div>
                  <strong>{formatDate(new Date(`${period.startDate}T12:00:00Z`), locale, { day: "2-digit", month: "long", year: "numeric" })} — {formatDate(new Date(`${period.endDate}T12:00:00Z`), locale, { day: "2-digit", month: "long", year: "numeric" })}</strong>
                  <span>[{locale === "ar" ? reasonLabel.ar : reasonLabel.fr}] {period.reason || (locale === "ar" ? "بدون سبب" : "Aucun motif indiqué")}</span>
                  {period.recurrenceGroupId && <small>{locale === "ar" ? "متكرر" : "Récurrente"}</small>}
                  {period.proofDocumentUrl && <a href={period.proofDocumentUrl} target="_blank" rel="noreferrer">{locale === "ar" ? "المستند الثبوتي" : "Justificatif"}</a>}
                </div>
                {active ? <form action={cancelUnavailabilityAction}><input type="hidden" name="id" value={period.id} /><button type="submit" className="secondary-action danger">{locale === "ar" ? "إلغاء" : "Annuler"}</button></form> : <small>{period.cancelledAt ? (locale === "ar" ? "ملغاة" : "Annulée") : (locale === "ar" ? "منتهية" : "Terminée")}</small>}
              </div>;
            })}
          </div>
          {periods.length === 0 && <div className="empty-state compact"><FiCalendar /><h3>{locale === "ar" ? "لا توجد فترات" : "Aucune indisponibilité"}</h3></div>}
        </section>
      </div>
    </>
  );
}
