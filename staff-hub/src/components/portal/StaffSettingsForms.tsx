"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import {
  updateLineupLockPolicyAction,
  updateTrainingApprovalPolicyAction,
  updateStatReviewPolicyAction,
  grantHeadCoachDelegationAction,
  revokeHeadCoachDelegationAction,
} from "@/app/actions";

interface DelegationRow {
  id: string;
  delegateeUserId: string;
  matchId: string | null;
  friendlyMatchId: number | null;
  validFrom: string | null;
  validUntil: string | null;
  reason: string;
  revokedAt: string | null;
}

interface MatchOption {
  kind: "OFFICIAL" | "FRIENDLY";
  id: string;
  label: string;
}

export function StaffSettingsForms({
  lineupLockPolicy,
  trainingApprovalPolicy,
  statReviewPolicy,
  delegations,
  qualifiedStaff,
  upcomingMatches,
}: {
  lineupLockPolicy: { enabled: boolean; lockMinutesBeforeKickoff: number };
  trainingApprovalPolicy: { approvalRequired: boolean };
  statReviewPolicy: { reviewWindowHours: number };
  delegations: DelegationRow[];
  qualifiedStaff: Array<{ id: number; label: string }>;
  upcomingMatches: MatchOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [lockEnabled, setLockEnabled] = useState(lineupLockPolicy.enabled);
  const [lockMinutes, setLockMinutes] = useState(lineupLockPolicy.lockMinutesBeforeKickoff);
  const [lockReason, setLockReason] = useState("");

  const [approvalRequired, setApprovalRequired] = useState(trainingApprovalPolicy.approvalRequired);
  const [approvalReason, setApprovalReason] = useState("");

  const [reviewHours, setReviewHours] = useState(statReviewPolicy.reviewWindowHours);
  const [reviewReason, setReviewReason] = useState("");

  const [delegateeUserId, setDelegateeUserId] = useState("");
  const [delegateeStaffId, setDelegateeStaffId] = useState<number | "">(qualifiedStaff[0]?.id ?? "");
  const [scopeKind, setScopeKind] = useState<"MATCH" | "PERIOD">("MATCH");
  const [matchOption, setMatchOption] = useState(upcomingMatches[0] ? `${upcomingMatches[0].kind}:${upcomingMatches[0].id}` : "");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [delegationReason, setDelegationReason] = useState("");

  function submitLineupLockPolicy() {
    startTransition(async () => {
      await updateLineupLockPolicyAction({ enabled: lockEnabled, lockMinutesBeforeKickoff: lockMinutes }, lockReason);
      setLockReason("");
      router.refresh();
    });
  }

  function submitTrainingApprovalPolicy() {
    startTransition(async () => {
      await updateTrainingApprovalPolicyAction({ approvalRequired }, approvalReason);
      setApprovalReason("");
      router.refresh();
    });
  }

  function submitStatReviewPolicy() {
    startTransition(async () => {
      await updateStatReviewPolicyAction({ reviewWindowHours: reviewHours }, reviewReason);
      setReviewReason("");
      router.refresh();
    });
  }

  function submitDelegation() {
    if (!delegateeUserId.trim() || delegateeStaffId === "" || !delegationReason.trim()) return;
    const [kind, id] = scopeKind === "MATCH" && matchOption ? matchOption.split(":") : [null, null];
    startTransition(async () => {
      await grantHeadCoachDelegationAction({
        delegateeUserId: delegateeUserId.trim(),
        delegateeStaffId: Number(delegateeStaffId),
        matchId: scopeKind === "MATCH" && kind === "OFFICIAL" ? (id ?? undefined) : undefined,
        friendlyMatchId: scopeKind === "MATCH" && kind === "FRIENDLY" ? Number(id) : undefined,
        validFrom: scopeKind === "PERIOD" ? validFrom || undefined : undefined,
        validUntil: scopeKind === "PERIOD" ? validUntil || undefined : undefined,
        reason: delegationReason.trim(),
      });
      setDelegateeUserId("");
      setDelegationReason("");
      setValidFrom("");
      setValidUntil("");
      router.refresh();
    });
  }

  function revoke(id: string) {
    const reason = window.prompt("Motif de révocation de la délégation :");
    if (!reason || !reason.trim()) return;
    startTransition(async () => {
      await revokeHeadCoachDelegationAction(id, reason.trim());
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Verrouillage de la composition (STAFF-002)</h2>
        <p style={{ fontSize: ".82rem", color: "var(--sh-text-muted)" }}>
          Une fois activé, la composition se verrouille automatiquement le nombre de minutes indiqué avant le coup d&apos;envoi, même sans action manuelle.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={lockEnabled} onChange={(e) => setLockEnabled(e.target.checked)} />
          Verrouillage automatique activé
        </label>
        <FormField label="Minutes avant le coup d'envoi">
          <Input type="number" min={0} value={lockMinutes} onChange={(e) => setLockMinutes(Number(e.target.value))} />
        </FormField>
        <FormField label="Motif du changement" required>
          <Textarea value={lockReason} onChange={(e) => setLockReason(e.target.value)} />
        </FormField>
        <Button variant="primary" disabled={pending || !lockReason.trim()} onClick={submitLineupLockPolicy}>
          Enregistrer
        </Button>
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Validation des plans d&apos;entraînement (STAFF-003)</h2>
        <p style={{ fontSize: ".82rem", color: "var(--sh-text-muted)" }}>
          Une fois activée, un plan créé par un adjoint reste en brouillon tant qu&apos;il n&apos;a pas été soumis puis approuvé par un autre membre du staff.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} />
          Validation requise
        </label>
        <FormField label="Motif du changement" required>
          <Textarea value={approvalReason} onChange={(e) => setApprovalReason(e.target.value)} />
        </FormField>
        <Button variant="primary" disabled={pending || !approvalReason.trim()} onClick={submitTrainingApprovalPolicy}>
          Enregistrer
        </Button>
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Revue des statistiques post-match (STAFF-004)</h2>
        <p style={{ fontSize: ".82rem", color: "var(--sh-text-muted)" }}>
          Passé ce délai après le match, toute correction d&apos;une statistique liée à un match exige un motif et reste tracée.
        </p>
        <FormField label="Fenêtre de revue (heures)">
          <Input type="number" min={0} value={reviewHours} onChange={(e) => setReviewHours(Number(e.target.value))} />
        </FormField>
        <FormField label="Motif du changement" required>
          <Textarea value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} />
        </FormField>
        <Button variant="primary" disabled={pending || !reviewReason.trim()} onClick={submitStatReviewPolicy}>
          Enregistrer
        </Button>
      </Card>

      <Card>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Délégation temporaire d&apos;entraîneur principal (STAFF-005)</h2>
        <p style={{ fontSize: ".82rem", color: "var(--sh-text-muted)" }}>
          Réservée à un coach ou un adjoint du club, bornée à un seul match ou à une période — jamais les deux.
        </p>

        {delegations.length === 0 ? (
          <EmptyState title="Aucune délégation" description="Aucune délégation de coach principal n'a été accordée." />
        ) : (
          <Table>
            <Thead>
              <Th>Compte</Th>
              <Th>Portée</Th>
              <Th>Motif</Th>
              <Th>Statut</Th>
              <Th></Th>
            </Thead>
            <tbody>
              {delegations.map((delegation) => (
                <Tr key={delegation.id}>
                  <Td>{delegation.delegateeUserId}</Td>
                  <Td>
                    {delegation.matchId
                      ? `Match ${delegation.matchId}`
                      : delegation.friendlyMatchId
                        ? `Match amical #${delegation.friendlyMatchId}`
                        : `${delegation.validFrom ? new Date(delegation.validFrom).toLocaleString("fr-FR") : "—"} → ${delegation.validUntil ? new Date(delegation.validUntil).toLocaleString("fr-FR") : "—"}`}
                  </Td>
                  <Td>{delegation.reason}</Td>
                  <Td>{delegation.revokedAt ? "Révoquée" : "Active"}</Td>
                  <Td>
                    {!delegation.revokedAt && (
                      <Button variant="danger" disabled={pending} onClick={() => revoke(delegation.id)}>
                        Révoquer
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}

        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--sh-border)", paddingTop: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <FormField label="Compte du délégataire" required>
              <Input value={delegateeUserId} onChange={(e) => setDelegateeUserId(e.target.value)} placeholder="ID du compte" />
            </FormField>
            <FormField label="Membre du staff qualifié" required>
              <Select value={delegateeStaffId} onChange={(e) => setDelegateeStaffId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">—</option>
                {qualifiedStaff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Portée">
              <Select value={scopeKind} onChange={(e) => setScopeKind(e.target.value as "MATCH" | "PERIOD")}>
                <option value="MATCH">Un seul match</option>
                <option value="PERIOD">Période bornée</option>
              </Select>
            </FormField>
            {scopeKind === "MATCH" ? (
              <FormField label="Match">
                <Select value={matchOption} onChange={(e) => setMatchOption(e.target.value)}>
                  {upcomingMatches.length === 0 && <option value="">Aucun match à venir</option>}
                  {upcomingMatches.map((match) => (
                    <option key={`${match.kind}:${match.id}`} value={`${match.kind}:${match.id}`}>
                      {match.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <>
                <FormField label="Début">
                  <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </FormField>
                <FormField label="Fin">
                  <Input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </FormField>
              </>
            )}
          </div>
          <FormField label="Motif de la délégation" required>
            <Textarea value={delegationReason} onChange={(e) => setDelegationReason(e.target.value)} />
          </FormField>
          <Button
            variant="primary"
            disabled={pending || !delegateeUserId.trim() || delegateeStaffId === "" || !delegationReason.trim()}
            onClick={submitDelegation}
          >
            Déléguer
          </Button>
        </div>
      </Card>
    </div>
  );
}
