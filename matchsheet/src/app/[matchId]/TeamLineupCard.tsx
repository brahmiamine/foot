"use client";

import { useLocalizedName } from "@/lib/i18n/LanguageContext";

interface LineupEntry {
  id: number;
  shirtNumber: number | null;
  isCaptain: boolean;
  position: string | null;
  nameFr: string;
  nameAr: string | null;
}

export function TeamLineupCard({
  teamName,
  starters,
  substitutes,
  hasComposition,
}: {
  teamName: string;
  starters: LineupEntry[];
  substitutes: LineupEntry[];
  hasComposition: boolean;
}) {
  return (
    <div className="card h-100">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-0">{teamName}</h5>
      </div>
      <div className="card-body">
        {!hasComposition ? (
          <p className="text-muted mb-0">Composition non renseignée (à faire depuis teamManager).</p>
        ) : (
          <>
            <h6 className="text-uppercase small text-muted fw-semibold">Titulaires ({starters.length}/11)</h6>
            <ul className="list-unstyled mb-3">
              {starters.map((e) => (
                <PlayerLine key={e.id} entry={e} />
              ))}
            </ul>
            <h6 className="text-uppercase small text-muted fw-semibold">Remplaçants ({substitutes.length})</h6>
            <ul className="list-unstyled mb-0">
              {substitutes.map((e) => (
                <PlayerLine key={e.id} entry={e} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerLine({ entry }: { entry: LineupEntry }) {
  const name = useLocalizedName(entry.nameFr, entry.nameAr);
  return (
    <li className="d-flex align-items-center gap-2 py-1">
      <span className="badge bg-light text-dark border" style={{ minWidth: "2rem" }}>
        {entry.shirtNumber ?? "—"}
      </span>
      <span>{name}</span>
      {entry.isCaptain && <span className="badge bg-warning-subtle text-warning">C</span>}
      {entry.position && <span className="text-muted small ms-auto">{entry.position}</span>}
    </li>
  );
}
