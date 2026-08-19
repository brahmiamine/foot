import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { EffectiveConfigurationService } from "@/services/EffectiveConfigurationService";

export const dynamic = "force-dynamic";

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function sourceLabel(source: {
  kind: "DEFAULT" | "POLICY";
  scopeType?: string;
  scopeId?: string | null;
  version?: number;
  effectiveFrom?: string | Date | null;
  effectiveUntil?: string | Date | null;
}): string {
  if (source.kind === "DEFAULT") return "Valeur par défaut";
  const scope = `${source.scopeType ?? "POLICY"}${source.scopeId ? ` · ${source.scopeId}` : ""}`;
  const version = source.version ? ` · v${source.version}` : "";
  const period = [source.effectiveFrom ? `depuis ${new Date(source.effectiveFrom).toLocaleString("fr-FR")}` : null,
    source.effectiveUntil ? `jusqu'au ${new Date(source.effectiveUntil).toLocaleString("fr-FR")}` : null]
    .filter(Boolean)
    .join(" · ");
  return `${scope}${version}${period ? ` · ${period}` : ""}`;
}

/** GOV-006 — panneau Club Hub de configuration effective et provenance. */
export default async function EffectiveConfigurationPage() {
  const access = await getUserAccess();
  if (!access.isClubAdmin) redirect("/admin");
  const teamId = await requireTeamId();
  const sections = await new EffectiveConfigurationService().resolveForTeam(teamId);

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="text-uppercase text-muted small fw-semibold">GOV-006 · Configuration effective</div>
          <h1 className="h3 mb-1">Configuration effective du club</h1>
          <p className="text-muted mb-0">
            Valeurs réellement appliquées côté serveur, avec leur portée, version et période d&apos;effet.
          </p>
        </div>
        <Link href="/admin/settings" className="btn btn-outline-secondary btn-sm">Retour aux réglages</Link>
      </div>

      <div className="alert alert-light border" role="status">
        Club : <code>{teamId}</code>. Les valeurs héritées sont résolues côté serveur ; ce panneau ne recalcule aucune policy dans le navigateur.
      </div>

      <div className="d-flex flex-column gap-4">
        {sections.map((section) => (
          <section key={section.domain} className="card shadow-sm">
            <div className="card-header bg-white d-flex flex-wrap justify-content-between gap-2 align-items-center">
              <div>
                <h2 className="h5 mb-0">{section.label}</h2>
                <code className="small text-muted">{section.domain}</code>
              </div>
              <span className="badge text-bg-light border">
                {section.appliedRecords.length} version{section.appliedRecords.length > 1 ? "s" : ""} appliquée{section.appliedRecords.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3 py-2">Clé</th>
                    <th className="px-3 py-2">Valeur effective</th>
                    <th className="px-3 py-2">Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {section.entries.map((entry) => (
                    <tr key={`${section.domain}:${entry.key}`}>
                      <td className="px-3 py-2"><code>{entry.key}</code></td>
                      <td className="px-3 py-2 text-break">{formatValue(entry.value)}</td>
                      <td className="px-3 py-2 text-muted">{sourceLabel(entry.source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
