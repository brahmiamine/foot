import type { PersonLicenseCardRecord } from "../../../../packages/regulatory-shared/src/licenseCard";
import type { LicenseStatusColors } from "./licenseCardStyles";

export function LicenseHeader({
  license,
  federationCode,
  federationName,
  officialDocumentLabel,
  statusLabel,
  statusColors,
}: {
  license: PersonLicenseCardRecord;
  federationCode: string;
  federationName: string;
  officialDocumentLabel: string;
  statusLabel: string;
  statusColors: LicenseStatusColors;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
        {license.federationLogoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- logo fédéral dynamique stocké dans le référentiel */}
            <img
              src={license.federationLogoUrl}
              alt={federationName}
              width={64}
              height={64}
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "contain", background: "#fff", padding: 5, flexShrink: 0 }}
            />
          </>
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", border: "4px solid #e30613", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e30613", display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, fontSize: 13 }}>
              {federationCode}
            </div>
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#a9bdca", fontWeight: 700 }}>
            {officialDocumentLabel}
          </div>
          <div style={{ fontSize: 13, color: "#e7eef2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
            {federationName}
          </div>
        </div>
      </div>
      <span style={{ ...statusColors, borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
        {statusLabel}
      </span>
    </div>
  );
}
