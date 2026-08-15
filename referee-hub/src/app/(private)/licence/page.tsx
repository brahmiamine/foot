import { FederationLicenseCard } from "@/components/license/FederationLicenseCard";
import { PageHeading } from "@/components/PageHeading";
import { getDataSource } from "@/lib/db";
import { getLocale } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { ProfileService } from "@/services/ProfileService";
import { listPersonLicenseCards } from "../../../../../packages/regulatory-shared/src/licenseCard";

export default async function LicencePage() {
  const [session, locale, dataSource] = await Promise.all([requireRequestSession(), getLocale(), getDataSource()]);
  const profile = await new ProfileService().getMine(session.id);
  const licenses = await listPersonLicenseCards(dataSource, {
    personTypes: ["REFEREE", "MATCH_OFFICIAL"],
    userId: session.id,
    personReferenceIds: profile?.referee ? [profile.referee.id] : [],
  });
  const current = licenses[0];
  const holderName = profile?.referee?.nom || profile?.user.name || session.name;

  return <>
    <PageHeading title={locale === "ar" ? "ترخيصي" : "Ma licence"} description={locale === "ar" ? "بطاقتك الاتحادية الرقمية وحالتها التنظيمية الفعلية." : "Votre carte fédérale numérique et son statut réglementaire réel."} />
    {!current ? <section className="panel-card"><h2>{locale === "ar" ? "لا يوجد ترخيص مرتبط بحسابك" : "Aucune licence liée à votre compte"}</h2><p>{locale === "ar" ? "يجب أن يكون ملف الحكم مرتبطاً بالحساب وأن توجد رخصة اتحادية للموسم." : "Votre fiche arbitre doit être liée au compte et une licence fédérale doit exister pour la saison."}</p></section> : <div style={{ display: "grid", gap: 18 }}>
      <FederationLicenseCard license={current} holderName={holderName} locale={locale} />
      {current.expiresAt && <p style={{ margin: 0, color: "var(--muted-text, #667085)", fontSize: ".82rem" }}>{locale === "ar" ? "انتهاء الصلاحية" : "Expiration"} : {new Date(current.expiresAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR")}</p>}
      {licenses.length > 1 && <section className="panel-card"><h2>{locale === "ar" ? "سجل التراخيص" : "Historique des licences"}</h2><div style={{ display: "grid", gap: 8 }}>{licenses.slice(1).map((license) => <div key={license.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(15,23,42,.08)" }}><span>{license.seasonName || "—"} · {license.licenseType}</span><strong>{license.licenseNumber || license.status}</strong></div>)}</div></section>}
    </div>}
  </>;
}
