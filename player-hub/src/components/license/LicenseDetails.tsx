import { getLicenseRoleLabel, type LicenseCardLocale, type PersonLicenseCardRecord } from "../../../../packages/regulatory-shared/src/licenseCard";

export function LicenseDetails({ license, holderName, locale, seasonLabel, clubLabel, noClubLabel, licenseNumberLabel }: {
  license: PersonLicenseCardRecord;
  holderName: string;
  locale: LicenseCardLocale;
  seasonLabel: string;
  clubLabel: string;
  noClubLabel: string;
  licenseNumberLabel: string;
}) {
  const isRtl = locale === "ar";
  return <>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 20, marginTop: 25, alignItems: "end" }}>
      <div><div style={{ fontSize: 14, color: "#d0dde5" }}>{getLicenseRoleLabel(license.personType, locale)}</div><div style={{ fontSize: 22, fontWeight: 750, lineHeight: 1.2, marginTop: 3 }}>{holderName}</div></div>
      <div style={{ textAlign: isRtl ? "left" : "right" }}><div style={{ fontSize: 12, color: "#d0dde5", textTransform: "uppercase" }}>{seasonLabel}</div><div style={{ fontSize: 18, fontWeight: 750, marginTop: 3 }}>{license.seasonName || "—"}</div></div>
    </div>
    <div style={{ height: 1, background: "rgba(255,255,255,.16)", margin: "22px 0 18px" }} />
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(130px,.75fr)", gap: 20 }}>
      <div><div style={{ fontSize: 12, color: "#a9bdca", textTransform: "uppercase" }}>{clubLabel}</div><div style={{ fontSize: 17, fontWeight: 750, marginTop: 4, lineHeight: 1.25 }}>{license.clubName || noClubLabel}</div></div>
      <div style={{ textAlign: isRtl ? "left" : "right" }}><div style={{ fontSize: 12, color: "#a9bdca" }}>{licenseNumberLabel}</div><div style={{ fontSize: 19, fontWeight: 800, marginTop: 4, overflowWrap: "anywhere" }}>{license.licenseNumber || "—"}</div></div>
    </div>
    {(license.category || license.licenseType) && <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>{license.category && <span style={{ fontSize: 11, padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.09)", color: "#dce8ee" }}>{license.category}</span>}{license.licenseType && <span style={{ fontSize: 11, padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.09)", color: "#dce8ee" }}>{license.licenseType}</span>}</div>}
  </>;
}
