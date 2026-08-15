import {
  getEffectiveLicenseStatus,
  getLicenseStatusLabel,
  type LicenseCardLocale,
  type PersonLicenseCardRecord,
} from "../../../../packages/regulatory-shared/src/licenseCard";
import { translate } from "@/i18n/dictionaries";
import { LicenseHeader } from "./LicenseHeader";
import { LicenseDetails } from "./LicenseDetails";
import { LicenseFooter } from "./LicenseFooter";
import { STATUS_COLORS } from "./licenseCardStyles";

export function FederationLicenseCard({ license, holderName, locale = "fr" }: { license: PersonLicenseCardRecord; holderName: string; locale?: LicenseCardLocale; }) {
  const effectiveStatus = getEffectiveLicenseStatus(license.status, license.expiresAt);
  const statusLabel = getLicenseStatusLabel(license.status, license.expiresAt, locale);
  const statusColors = STATUS_COLORS[effectiveStatus] ?? STATUS_COLORS.DRAFT;
  const federationCode = license.federationCode || "FTF";
  const federationName = license.federationName || translate(locale, "license.federationFallback");
  const isRtl = locale === "ar";

  return <article dir={isRtl ? "rtl" : "ltr"} aria-label={translate(locale, "license.ariaLabel", { federationCode, holderName })} style={{ width: "100%", maxWidth: 430, minHeight: 360, position: "relative", overflow: "hidden", borderRadius: 26, color: "#fff", background: "linear-gradient(145deg, #061d2d 0%, #031522 58%, #081d2c 100%)", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 20px 55px rgba(3, 21, 34, .28)" }}>
    <div style={{ height: 7, background: "#e30613" }} />
    <div style={{ padding: "22px 26px 20px" }}>
      <LicenseHeader license={license} federationCode={federationCode} federationName={federationName} officialDocumentLabel={translate(locale, "license.officialDocument")} statusLabel={statusLabel} statusColors={statusColors} />
      <div style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 400, marginTop: 24, letterSpacing: "-.025em" }}>{translate(locale, "license.title", { federationCode })}</div>
      <LicenseDetails license={license} holderName={holderName} locale={locale} seasonLabel={translate(locale, "license.season")} clubLabel={translate(locale, "license.club")} noClubLabel={translate(locale, "license.noClub")} licenseNumberLabel={translate(locale, "license.number")} />
    </div>
    <LicenseFooter federationCode={federationCode} digitalCardLabel={translate(locale, "license.digitalCard")} realtimeStatusLabel={translate(locale, "license.realtimeStatus")} isRtl={isRtl} />
    {effectiveStatus !== "APPROVED" && <div aria-hidden="true" style={{ position: "absolute", inset: "46% auto auto 50%", transform: "translate(-50%,-50%) rotate(-12deg)", border: "3px solid rgba(255,255,255,.16)", color: "rgba(255,255,255,.18)", borderRadius: 8, padding: "8px 15px", fontSize: 25, fontWeight: 900, letterSpacing: ".08em", pointerEvents: "none", whiteSpace: "nowrap" }}>{statusLabel.toUpperCase()}</div>}
  </article>;
}
