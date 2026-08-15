import {
  getEffectiveLicenseStatus,
  getLicenseRoleLabel,
  getLicenseStatusLabel,
  type LicenseCardLocale,
  type PersonLicenseCardRecord,
} from "../../../../packages/regulatory-shared/src/licenseCard";

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  APPROVED: { background: "#d1fae5", color: "#065f46" },
  SUSPENDED: { background: "#fef3c7", color: "#92400e" },
  EXPIRED: { background: "#e5e7eb", color: "#374151" },
  REVOKED: { background: "#fee2e2", color: "#991b1b" },
  REJECTED: { background: "#fee2e2", color: "#991b1b" },
  UNDER_REVIEW: { background: "#dbeafe", color: "#1e40af" },
  SUBMITTED: { background: "#cffafe", color: "#155e75" },
  DRAFT: { background: "#f3f4f6", color: "#4b5563" },
};

export function FederationLicenseCard({
  license,
  holderName,
  locale = "fr",
}: {
  license: PersonLicenseCardRecord;
  holderName: string;
  locale?: LicenseCardLocale;
}) {
  const effectiveStatus = getEffectiveLicenseStatus(license.status, license.expiresAt);
  const statusLabel = getLicenseStatusLabel(license.status, license.expiresAt, locale);
  const statusColors = STATUS_COLORS[effectiveStatus] ?? STATUS_COLORS.DRAFT;
  const federationCode = license.federationCode || "FTF";
  const federationName = license.federationName || (locale === "ar" ? "الجامعة التونسية لكرة القدم" : "Fédération Tunisienne de Football");
  const isRtl = locale === "ar";

  return (
    <article
      dir={isRtl ? "rtl" : "ltr"}
      aria-label={`${locale === "ar" ? "ترخيص" : "Licence"} ${federationCode} ${holderName}`}
      style={{
        width: "100%",
        maxWidth: 430,
        minHeight: 360,
        position: "relative",
        overflow: "hidden",
        borderRadius: 26,
        color: "#fff",
        background: "linear-gradient(145deg, #061d2d 0%, #031522 58%, #081d2c 100%)",
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "0 20px 55px rgba(3, 21, 34, .28)",
      }}
    >
      <div style={{ height: 7, background: "#e30613" }} />
      <div style={{ padding: "22px 26px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
            {license.federationLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo fédéral dynamique stocké dans le référentiel
              <img src={license.federationLogoUrl} alt={federationName} width={64} height={64} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "contain", background: "#fff", padding: 5, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", border: "4px solid #e30613", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e30613", display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, fontSize: 13 }}>{federationCode}</div>
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#a9bdca", fontWeight: 700 }}>{locale === "ar" ? "وثيقة رسمية" : "Document officiel"}</div>
              <div style={{ fontSize: 13, color: "#e7eef2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{federationName}</div>
            </div>
          </div>
          <span style={{ ...statusColors, borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{statusLabel}</span>
        </div>

        <div style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 400, marginTop: 24, letterSpacing: "-.025em" }}>
          {locale === "ar" ? `ترخيص ${federationCode}` : `Licence ${federationCode}`}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 20, marginTop: 25, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 14, color: "#d0dde5" }}>{getLicenseRoleLabel(license.personType, locale)}</div>
            <div style={{ fontSize: 22, fontWeight: 750, lineHeight: 1.2, marginTop: 3 }}>{holderName}</div>
          </div>
          <div style={{ textAlign: isRtl ? "left" : "right" }}>
            <div style={{ fontSize: 12, color: "#d0dde5", textTransform: "uppercase" }}>{locale === "ar" ? "الموسم" : "Saison"}</div>
            <div style={{ fontSize: 18, fontWeight: 750, marginTop: 3 }}>{license.seasonName || "—"}</div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,.16)", margin: "22px 0 18px" }} />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(130px,.75fr)", gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: "#a9bdca", textTransform: "uppercase" }}>{locale === "ar" ? "النادي" : "Club"}</div>
            <div style={{ fontSize: 17, fontWeight: 750, marginTop: 4, lineHeight: 1.25 }}>{license.clubName || (locale === "ar" ? "دون ناد" : "Sans club")}</div>
          </div>
          <div style={{ textAlign: isRtl ? "left" : "right" }}>
            <div style={{ fontSize: 12, color: "#a9bdca" }}>{locale === "ar" ? "رقم الترخيص" : "N° de licencié(e)"}</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4, overflowWrap: "anywhere" }}>{license.licenseNumber || "—"}</div>
          </div>
        </div>

        {(license.category || license.licenseType) && (
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {license.category && <span style={{ fontSize: 11, padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.09)", color: "#dce8ee" }}>{license.category}</span>}
            {license.licenseType && <span style={{ fontSize: 11, padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.09)", color: "#dce8ee" }}>{license.licenseType}</span>}
          </div>
        )}
      </div>

      <div style={{ minHeight: 70, background: "linear-gradient(100deg, #d90012, #ef0718)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", color: "#e30613", fontSize: 18, fontWeight: 900 }}>★</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{federationCode}</div>
            <div style={{ fontSize: 10, opacity: .9 }}>{locale === "ar" ? "بطاقة رقمية اتحادية" : "Carte fédérale numérique"}</div>
          </div>
        </div>
        <div style={{ fontSize: 10, opacity: .85, textAlign: isRtl ? "left" : "right", maxWidth: 160 }}>
          {locale === "ar" ? "الحالة المعروضة هي الحالة الفعلية في النظام" : "Le statut affiché reflète l’état réglementaire en temps réel"}
        </div>
      </div>

      {effectiveStatus !== "APPROVED" && (
        <div aria-hidden="true" style={{ position: "absolute", inset: "46% auto auto 50%", transform: "translate(-50%,-50%) rotate(-12deg)", border: "3px solid rgba(255,255,255,.16)", color: "rgba(255,255,255,.18)", borderRadius: 8, padding: "8px 15px", fontSize: 25, fontWeight: 900, letterSpacing: ".08em", pointerEvents: "none", whiteSpace: "nowrap" }}>{statusLabel.toUpperCase()}</div>
      )}
    </article>
  );
}
