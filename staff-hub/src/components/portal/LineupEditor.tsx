"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import {
  approveLineupAction,
  lockLineupAction,
  proposeLineupAction,
  removeLineupEntryAction,
  setFormationAction,
  setLineupEntryAction,
} from "@/app/actions";
import type { LineupRole } from "@/entities/MatchLineup";
import type { FormationWorkflowStatus } from "@/entities/MatchFormation";

interface RosterRow {
  id: string;
  entryId: number | null;
  label: string;
  role: LineupRole | "NONE";
  shirtNumber: number | null;
  isCaptain: boolean;
}

const STATUS_LABELS: Record<FormationWorkflowStatus, string> = {
  DRAFT: "Brouillon",
  PROPOSED: "Proposée",
  APPROVED: "Approuvée",
  LOCKED: "Verrouillée",
};

export function LineupEditor({
  matchType,
  matchId,
  friendlyMatchId,
  initialFormation,
  initialRoster,
  workflowStatus,
  canEdit,
  canPropose,
  canApprove,
}: {
  matchType: "OFFICIAL" | "FRIENDLY";
  matchId?: string;
  friendlyMatchId?: number;
  initialFormation: string;
  initialRoster: RosterRow[];
  workflowStatus: FormationWorkflowStatus;
  canEdit: boolean;
  canPropose: boolean;
  canApprove: boolean;
}) {
  const [formation, setFormation] = useState(initialFormation);
  const [rows, setRows] = useState(initialRoster);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const editingLocked = workflowStatus === "APPROVED" || workflowStatus === "LOCKED" || !canEdit;

  function updateRow(id: string, patch: Partial<RosterRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function persistDraft() {
    await setFormationAction(matchType, formation, matchId, friendlyMatchId);
    for (const row of rows) {
      if (row.role === "NONE") {
        if (row.entryId != null) await removeLineupEntryAction(row.entryId);
        continue;
      }
      await setLineupEntryAction(matchType, row.id, row.role, {
        matchId,
        friendlyMatchId,
        shirtNumber: row.shirtNumber ?? undefined,
        isCaptain: row.isCaptain,
      });
    }
  }

  function run(action: () => Promise<void>, successMessage: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(successMessage);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Action impossible");
      }
    });
  }

  function save() {
    run(persistDraft, "Brouillon enregistré.");
  }

  function propose() {
    run(async () => {
      if (canEdit && workflowStatus !== "APPROVED" && workflowStatus !== "LOCKED") {
        await persistDraft();
      }
      await proposeLineupAction(matchType, matchId, friendlyMatchId);
    }, "Composition soumise au coach.");
  }

  function approve() {
    run(
      () => approveLineupAction(matchType, matchId, friendlyMatchId),
      "Composition approuvée.",
    );
  }

  function lock() {
    run(
      () => lockLineupAction(matchType, matchId, friendlyMatchId),
      "Composition approuvée et verrouillée.",
    );
  }

  const starters = rows.filter((row) => row.role === "STARTER").length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>Statut : {STATUS_LABELS[workflowStatus]}</span>
        <span style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)" }}>
          {starters} titulaire(s) sélectionné(s)
        </span>
      </div>

      {message && (
        <div style={{ fontSize: "0.82rem", color: "var(--sh-text-muted)" }} role="status">
          {message}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Formation</label>
        <Input
          value={formation}
          onChange={(event) => setFormation(event.target.value)}
          style={{ width: 120 }}
          placeholder="4-3-3"
          disabled={editingLocked}
        />
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
                <Select
                  value={row.role}
                  onChange={(event) => updateRow(row.id, { role: event.target.value as RosterRow["role"] })}
                  style={{ width: 140 }}
                  disabled={editingLocked}
                >
                  <option value="NONE">—</option>
                  <option value="STARTER">Titulaire</option>
                  <option value="SUBSTITUTE">Remplaçant</option>
                </Select>
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.shirtNumber ?? ""}
                  onChange={(event) => updateRow(row.id, { shirtNumber: event.target.value ? Number(event.target.value) : null })}
                  style={{ width: 70 }}
                  disabled={editingLocked || row.role === "NONE"}
                />
              </Td>
              <Td>
                <input
                  type="checkbox"
                  checked={row.isCaptain}
                  onChange={(event) => updateRow(row.id, { isCaptain: event.target.checked })}
                  disabled={editingLocked || row.role === "NONE"}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canEdit && workflowStatus !== "APPROVED" && workflowStatus !== "LOCKED" && (
          <Button variant="primary" disabled={pending} onClick={save}>
            {pending ? "Enregistrement…" : "Enregistrer le brouillon"}
          </Button>
        )}
        {canPropose && (workflowStatus === "DRAFT" || workflowStatus === "PROPOSED") && (
          <Button disabled={pending} onClick={propose}>
            {workflowStatus === "PROPOSED" ? "Resoumettre" : "Soumettre au coach"}
          </Button>
        )}
        {canApprove && workflowStatus === "PROPOSED" && (
          <Button variant="primary" disabled={pending} onClick={approve}>
            Approuver
          </Button>
        )}
        {canApprove && workflowStatus === "APPROVED" && (
          <Button variant="primary" disabled={pending} onClick={lock}>
            Verrouiller définitivement
          </Button>
        )}
      </div>
    </div>
  );
}
