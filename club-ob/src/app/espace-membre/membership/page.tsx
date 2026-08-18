import { getSsoSession } from "@/lib/ssoSession";
import { getObTeam } from "@/lib/ob-team";
import { fetchActiveMembership, fetchMembershipTypes } from "@/lib/clubHubApi";
import { getTranslator } from "@/i18n/server";
import shared from "@/components/shared.module.css";
import { applyMembershipAction } from "./actions";

export const dynamic = "force-dynamic";

/** OB-002 : statut de membership du membre connecté + candidature. */
export default async function MembershipPage() {
  const { t } = await getTranslator();
  const session = await getSsoSession();
  const team = await getObTeam();
  if (!session || !team) {
    return <p className={shared.empty}>{t("member.serviceUnavailable")}</p>;
  }

  let active: Awaited<ReturnType<typeof fetchActiveMembership>> = null;
  let types: Awaited<ReturnType<typeof fetchMembershipTypes>> = [];
  try {
    [active, types] = await Promise.all([
      fetchActiveMembership(team.id, session.id),
      fetchMembershipTypes(team.id),
    ]);
  } catch {
    return <p className={shared.empty}>{t("member.serviceUnavailable")}</p>;
  }

  if (active) {
    return (
      <div className={shared.card} style={{ padding: 24, maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>{active.code}</h2>
        <p>{active.expiresAt ? `Valide jusqu'au ${new Date(active.expiresAt).toLocaleDateString("fr-TN")}` : "Sans expiration"}</p>
        {active.rights.length > 0 && (
          <ul>
            {active.rights.map((right) => (
              <li key={right}>{right}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={shared.card} style={{ padding: 24, maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Devenir membre</h2>
      {types.length === 0 ? (
        <p className={shared.empty}>Aucun type de membership disponible pour le moment.</p>
      ) : (
        <form action={applyMembershipAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <select name="membershipTypeId" required defaultValue="">
            <option value="" disabled>
              Choisir un type de membership
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.labelFr}
                {type.requiresApproval ? " (soumis à approbation)" : ""}
              </option>
            ))}
          </select>
          <button type="submit" className={shared.btnPrimary}>
            Envoyer ma candidature
          </button>
        </form>
      )}
    </div>
  );
}
