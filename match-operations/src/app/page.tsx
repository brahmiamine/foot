import Link from "next/link";
import { cookies, headers } from "next/headers";
import { MatchAccessService } from "@/services/MatchAccessService";
import { translate } from "@/lib/i18n/dictionaries";
import { LANGUAGE_COOKIE, resolveLanguage } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const lang = resolveLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
  const requestHeaders = await headers();
  const userId = requestHeaders.get("x-sso-user-id");
  const role = requestHeaders.get("x-sso-role");
  const teamId = requestHeaders.get("x-sso-team-id");

  const matches =
    userId && role
      ? await new MatchAccessService().listAccessibleMatches({ userId, role, teamId })
      : [];

  if (matches.length === 0) {
    return (
      <div className="match-operations-empty">
        <div>
          <i className="bx bx-calendar-x text-muted mb-3 d-block" style={{ fontSize: "3rem" }} aria-hidden="true" />
          <h1 className="h4 text-muted">{lang === "ar" ? "مبارياتي" : "Mes matchs"}</h1>
          <p className="text-muted mb-0">{translate(lang, "match.selection.empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0 py-3">
      <div className="mb-4 pe-5">
        <h1 className="h4 mb-1">{lang === "ar" ? "مبارياتي" : "Mes matchs"}</h1>
        <p className="text-muted mb-0">
          {lang === "ar"
            ? "اختر مباراة لفتح ورقة المباراة الإلكترونية الخاصة بك."
            : "Sélectionnez un match pour ouvrir la feuille électronique correspondant à votre rôle."}
        </p>
      </div>

      <div className="list-group" aria-label={translate(lang, "match.list.label")}>
        {matches.map((match) => {
          const homeName =
            lang === "ar" && match.homeTeam?.nomAr ? match.homeTeam.nomAr : match.homeTeam?.nom ?? "?";
          const awayName =
            lang === "ar" && match.awayTeam?.nomAr ? match.awayTeam.nomAr : match.awayTeam?.nom ?? "?";
          const date = match.date
            ? match.date.toLocaleString(lang === "ar" ? "ar-TN" : "fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : translate(lang, "match.date.undefined");

          return (
            <Link
              key={match.id}
              href={`/${match.id}`}
              className="list-group-item list-group-item-action d-flex align-items-center justify-content-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="fw-semibold text-body">
                  {homeName} {translate(lang, "match.versus")} {awayName}
                </div>
                <div className="small text-muted mt-1">
                  {date}
                  {match.matchday?.number ? ` · ${translate(lang, "match.matchday", { number: match.matchday.number })}` : ""}
                </div>
              </div>
              <i className="bx bx-chevron-right fs-3 text-muted" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
