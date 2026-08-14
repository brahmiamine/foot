"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { setFormationAction, setLineupEntryAction } from "@/app/actions";
import type { LineupRole } from "@/entities/MatchLineup";

interface RosterRow {
  id: string;
  label: string;
  role: LineupRole | "NONE";
  shirtNumber: number | null;
  isCaptain: boolean;
}

export function LineupEditor({
  matchType,
  matchId,
  friendlyMatchId,
  initialFormation,
  initialRoster,
}: {
  matchType: "OFFICIAL" | "FRIENDLY";
  matchId?: string;
  friendlyMatchId?: number;
  initialFormation: string;
  initialRoster: RosterRow[];
}) {
  const [formation, setFormation] = useState(initialFormation);
  const [rows, setRows] = useState(initialRoster);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function updateRow(id: string, patch: Partial<RosterRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function save() {
    startTransition(async () => {
      await setFormationAction(matchType, formation, matchId, friendlyMatchId);
      for (const row of rows) {
        if (row.role === "NONE") continue;
        await setLineupEntryAction(matchType, row.id, row.role, {
          matchId,
          friendlyMatchId,
          shirtNumber: row.shirtNumber ?? undefined,
          isCaptain: row.isCaptain,
        });
      }
      router.refresh();
    });
  }

  const starters = rows.filter((r) => r.role === "STARTER").length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Formation</label>
        <Input value={formation} onChange={(e) => setFormation(e.target.value)} style={{ width: 120 }} placeholder="4-3-3" />
        <span style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)" }}>{starters} titulaire(s) sélectionné(s)</span>
      </div>

      <Table>
        <Thead>
          <Th>Joueur</Th>
          <Th>Rôle</Th>
          <Th>N° maillot</Th>
          <Th>Capitaine</Th>
        </Thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.id}>
              <Td>{row.label}</Td>
              <Td>
                <Select value={row.role} onChange={(e) => updateRow(row.id, { role: e.target.value as RosterRow["role"] })} style={{ width: 140 }}>
                  <option value="NONE">—</option>
                  <option value="STARTER">Titulaire</option>
                  <option value="SUBSTITUTE">Remplaçant</option>
                </Select>
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.shirtNumber ?? ""}
                  onChange={(e) => updateRow(row.id, { shirtNumber: e.target.value ? Number(e.target.value) : null })}
                  style={{ width: 70 }}
                  disabled={row.role === "NONE"}
                />
              </Td>
              <Td>
                <input
                  type="checkbox"
                  checked={row.isCaptain}
                  onChange={(e) => updateRow(row.id, { isCaptain: e.target.checked })}
                  disabled={row.role === "NONE"}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <div>
        <Button variant="primary" disabled={pending} onClick={save}>
          {pending ? "Enregistrement…" : "Enregistrer la composition"}
        </Button>
      </div>
    </div>
  );
}
