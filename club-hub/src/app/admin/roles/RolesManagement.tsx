"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS } from "@/types/categories";
import {
  assignRoleToUser,
  createRole,
  createRoleDelegation,
  deleteRole,
  revokeRoleAssignment,
  revokeRoleDelegation,
  updateRole,
} from "./actions";

interface PermissionDef { key: string; label: string; }
interface PermissionModule { key: string; label: string; permissions: PermissionDef[]; }
interface RoleData {
  id: number;
  name: string;
  description: string | null;
  isGlobal: boolean;
  isSystem: boolean;
  permissions: string[];
}
interface AssignmentData {
  id: number;
  userId: string;
  userName: string;
  roleId: number;
  roleName: string;
  category: string | null;
  validFrom: string | null;
  validUntil: string | null;
  grantReason: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
}
interface DelegationData {
  id: number;
  delegatorUserId: string;
  delegatorName: string;
  delegateeUserId: string;
  delegateeName: string;
  permissions: string[];
  category: string | null;
  validFrom: string;
  validUntil: string;
  reason: string;
  revokedAt: string | null;
  revocationReason: string | null;
  canRevoke: boolean;
}
interface UserOption { id: string; name: string; email: string; }

function toIsoLocal(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Date invalide");
  return date.toISOString();
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function accessStatus(
  validFrom: string | null,
  validUntil: string | null,
  revokedAt: string | null,
): { label: string; className: string } {
  if (revokedAt) return { label: "Révoqué", className: "bg-danger-subtle text-danger" };
  const now = Date.now();
  if (validFrom && new Date(validFrom).getTime() > now) return { label: "Planifié", className: "bg-info-subtle text-info" };
  if (validUntil && new Date(validUntil).getTime() <= now) return { label: "Expiré", className: "bg-secondary-subtle text-secondary" };
  return { label: "Actif", className: "bg-success-subtle text-success" };
}

export function RolesManagement({
  initialRoles,
  initialAssignments,
  initialDelegations,
  users,
  permissionModules,
  canAdministerRoles,
  delegableScopes,
}: {
  initialRoles: RoleData[];
  initialAssignments: AssignmentData[];
  initialDelegations: DelegationData[];
  users: UserOption[];
  permissionModules: PermissionModule[];
  canAdministerRoles: boolean;
  delegableScopes: Record<string, string[]>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assignmentRoleId, setAssignmentRoleId] = useState<number | null>(initialRoles[0]?.id ?? null);
  const scopeKeys = useMemo(() => Object.keys(delegableScopes), [delegableScopes]);
  const [delegationScope, setDelegationScope] = useState(scopeKeys[0] ?? "");
  const selectedRole = initialRoles.find((role) => role.id === assignmentRoleId) ?? null;
  const allowedDelegationPermissions = useMemo(
    () => new Set(delegableScopes[delegationScope] ?? []),
    [delegableScopes, delegationScope],
  );

  const run = async (operation: () => Promise<{ success: boolean; error?: string; message?: string }>) => {
    setError(null);
    setSuccess(null);
    const result = await operation();
    if (!result.success) {
      setError(result.error ?? "Une erreur est survenue");
      return;
    }
    setSuccess(result.message ?? "Opération réussie");
    startTransition(() => router.refresh());
  };

  const submitWithIsoDates = async (
    form: HTMLFormElement,
    action: (data: FormData) => Promise<{ success: boolean; error?: string; message?: string }>,
    dateKeys: string[],
  ) => {
    const data = new FormData(form);
    try {
      for (const key of dateKeys) {
        const iso = toIsoLocal(data.get(key));
        if (iso) data.set(key, iso);
        else data.delete(key);
      }
    } catch (dateError) {
      setError(dateError instanceof Error ? dateError.message : "Date invalide");
      return;
    }
    await run(() => action(data));
  };

  const revokeAssignment = (assignment: AssignmentData) => {
    const defaultReason = assignment.validFrom || assignment.validUntil
      ? "Fin anticipée de l'intérim"
      : "Retrait administratif de l'attribution";
    const reason = window.prompt("Motif de révocation", defaultReason);
    if (!reason?.trim()) return;
    const data = new FormData();
    data.set("reason", reason.trim());
    void run(() => revokeRoleAssignment(assignment.id, data));
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h4 mb-1">Rôles, accès temporaires & délégations</h1>
          <p className="text-muted mb-0">Les délégations sont bornées dans le temps et ne peuvent jamais être redéléguées.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {canAdministerRoles && (
        <section className="card mb-4">
          <div className="card-header"><h2 className="h6 mb-0">Créer un rôle</h2></div>
          <div className="card-body">
            <form onSubmit={(event) => { event.preventDefault(); void run(() => createRole(new FormData(event.currentTarget))); }}>
              <div className="row g-3">
                <div className="col-md-4"><label className="form-label">Nom</label><input name="name" className="form-control" required maxLength={100} /></div>
                <div className="col-md-6"><label className="form-label">Description</label><input name="description" className="form-control" maxLength={255} /></div>
                <div className="col-md-2 d-flex align-items-end"><div className="form-check mb-2"><input id="create-global" name="isGlobal" type="checkbox" className="form-check-input" /><label htmlFor="create-global" className="form-check-label">Global</label></div></div>
              </div>
              <div className="row g-3 mt-1">
                {permissionModules.map((module) => (
                  <div className="col-md-4" key={module.key}>
                    <div className="border rounded p-3 h-100">
                      <strong className="d-block mb-2">{module.label}</strong>
                      {module.permissions.map((permission) => (
                        <div className="form-check" key={permission.key}>
                          <input className="form-check-input" type="checkbox" name="permissions" value={permission.key} id={`create-${permission.key}`} />
                          <label className="form-check-label" htmlFor={`create-${permission.key}`}>{permission.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary mt-3" disabled={isPending}>Créer le rôle</button>
            </form>
          </div>
        </section>
      )}

      {canAdministerRoles && (
        <section className="card mb-4">
          <div className="card-header"><h2 className="h6 mb-0">Rôles du club</h2></div>
          <div className="card-body">
            <div className="row g-3">
              {initialRoles.map((role) => (
                <div className="col-lg-6" key={role.id}>
                  <div className="border rounded p-3 h-100">
                    <div className="d-flex justify-content-between gap-2 mb-2">
                      <div><strong>{role.name}</strong> {role.isSystem && <span className="badge bg-secondary ms-1">Système</span>} {role.isGlobal && <span className="badge bg-primary ms-1">Global</span>}</div>
                      <span className="badge bg-light text-dark">{role.permissions.length} permissions</span>
                    </div>
                    <p className="small text-muted">{role.description || "Sans description"}</p>
                    <div className="small mb-3">{role.permissions.join(", ") || "Aucune permission"}</div>
                    <details>
                      <summary className="btn btn-outline-secondary btn-sm">Modifier</summary>
                      <form className="mt-3" onSubmit={(event) => { event.preventDefault(); void run(() => updateRole(role.id, new FormData(event.currentTarget))); }}>
                        <div className="row g-2">
                          <div className="col-md-5"><input name="name" className="form-control form-control-sm" defaultValue={role.name} required /></div>
                          <div className="col-md-7"><input name="description" className="form-control form-control-sm" defaultValue={role.description ?? ""} /></div>
                        </div>
                        <div className="form-check my-2"><input name="isGlobal" id={`global-${role.id}`} type="checkbox" className="form-check-input" defaultChecked={role.isGlobal} /><label htmlFor={`global-${role.id}`} className="form-check-label">Portée globale</label></div>
                        <div className="row g-2">
                          {permissionModules.map((module) => (
                            <div className="col-md-6" key={module.key}><div className="border rounded p-2 h-100"><strong className="small">{module.label}</strong>{module.permissions.map((permission) => (
                              <div className="form-check" key={permission.key}><input className="form-check-input" type="checkbox" name="permissions" value={permission.key} id={`role-${role.id}-${permission.key}`} defaultChecked={role.permissions.includes(permission.key)} /><label className="form-check-label small" htmlFor={`role-${role.id}-${permission.key}`}>{permission.label}</label></div>
                            ))}</div></div>
                          ))}
                        </div>
                        <div className="d-flex gap-2 mt-3">
                          <button className="btn btn-primary btn-sm" disabled={isPending}>Enregistrer</button>
                          {!role.isSystem && <button type="button" className="btn btn-outline-danger btn-sm" disabled={isPending} onClick={() => { if (window.confirm(`Supprimer le rôle « ${role.name} » ?`)) void run(() => deleteRole(role.id)); }}>Supprimer</button>}
                        </div>
                      </form>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {canAdministerRoles && (
        <section className="card mb-4">
          <div className="card-header"><h2 className="h6 mb-0">Attribuer un rôle direct</h2></div>
          <div className="card-body">
            <form onSubmit={(event) => { event.preventDefault(); void submitWithIsoDates(event.currentTarget, assignRoleToUser, ["validFrom", "validUntil"]); }}>
              <div className="row g-3">
                <div className="col-lg-3"><label className="form-label">Compte</label><select name="userId" className="form-select" required><option value="">Choisir…</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></div>
                <div className="col-lg-3"><label className="form-label">Rôle</label><select name="roleId" className="form-select" required value={assignmentRoleId ?? ""} onChange={(event) => setAssignmentRoleId(Number(event.target.value))}><option value="">Choisir…</option>{initialRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
                <div className="col-lg-2"><label className="form-label">Catégorie</label><select name="category" className="form-select" disabled={selectedRole?.isGlobal}><option value="">{selectedRole?.isGlobal ? "Toutes" : "Choisir…"}</option>{AGE_CATEGORIES.map((category) => <option key={category} value={category}>{AGE_CATEGORY_LABELS[category]}</option>)}</select></div>
                <div className="col-lg-2"><label className="form-label">Actif à partir de</label><input type="datetime-local" name="validFrom" className="form-control" /></div>
                <div className="col-lg-2"><label className="form-label">Jusqu’au</label><input type="datetime-local" name="validUntil" className="form-control" /></div>
                <div className="col-12"><label className="form-label">Motif <span className="text-muted">(obligatoire si temporaire)</span></label><input name="reason" className="form-control" maxLength={1000} placeholder="Remplacement, intérim, tournoi…" /></div>
              </div>
              <button className="btn btn-primary mt-3" disabled={isPending}>Attribuer</button>
            </form>
          </div>
        </section>
      )}

      <section className="card mb-4">
        <div className="card-header"><h2 className="h6 mb-0">Attributions directes visibles</h2></div>
        <div className="table-responsive">
          <table className="table align-middle mb-0"><thead><tr><th>Compte</th><th>Rôle</th><th>Portée</th><th>Fenêtre</th><th>Statut</th>{canAdministerRoles && <th>Action</th>}</tr></thead><tbody>
            {initialAssignments.map((assignment) => {
              const status = accessStatus(assignment.validFrom, assignment.validUntil, assignment.revokedAt);
              const temporary = Boolean(assignment.validFrom || assignment.validUntil);
              return <tr key={assignment.id}><td>{assignment.userName}</td><td>{assignment.roleName}</td><td>{assignment.category ? AGE_CATEGORY_LABELS[assignment.category as keyof typeof AGE_CATEGORY_LABELS] ?? assignment.category : "Toutes"}</td><td><div className="small">{temporary ? `${formatDate(assignment.validFrom)} → ${formatDate(assignment.validUntil)}` : "Permanent"}</div>{assignment.grantReason && <div className="small text-muted">{assignment.grantReason}</div>}</td><td><span className={`badge ${status.className}`}>{status.label}</span>{assignment.revocationReason && <div className="small text-muted mt-1">{assignment.revocationReason}</div>}</td>{canAdministerRoles && <td>{!assignment.revokedAt && <button className="btn btn-outline-danger btn-sm" onClick={() => revokeAssignment(assignment)}>Révoquer</button>}</td>}</tr>;
            })}
            {initialAssignments.length === 0 && <tr><td colSpan={canAdministerRoles ? 6 : 5} className="text-center text-muted py-4">Aucune attribution visible</td></tr>}
          </tbody></table>
        </div>
      </section>

      <section className="card mb-4">
        <div className="card-header"><h2 className="h6 mb-0">Créer une délégation temporaire</h2></div>
        <div className="card-body">
          {scopeKeys.length === 0 ? (
            <div className="alert alert-info mb-0">Vous ne possédez pas directement <code>roles.manage</code> sur une portée délégable. Un droit reçu par délégation ne peut pas être redélégué.</div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); data.set("category", delegationScope === "ALL" ? "" : delegationScope); try { const from = toIsoLocal(data.get("validFrom")); const until = toIsoLocal(data.get("validUntil")); if (!from || !until) throw new Error("Début et fin de délégation requis"); data.set("validFrom", from); data.set("validUntil", until); } catch (dateError) { setError(dateError instanceof Error ? dateError.message : "Date invalide"); return; } void run(() => createRoleDelegation(data)); }}>
              <div className="row g-3">
                <div className="col-lg-4"><label className="form-label">Destinataire</label><select name="delegateeUserId" className="form-select" required><option value="">Choisir…</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></div>
                <div className="col-lg-2"><label className="form-label">Portée</label><select className="form-select" value={delegationScope} onChange={(event) => setDelegationScope(event.target.value)}>{scopeKeys.map((scope) => <option key={scope} value={scope}>{scope === "ALL" ? "Toutes catégories" : AGE_CATEGORY_LABELS[scope as keyof typeof AGE_CATEGORY_LABELS] ?? scope}</option>)}</select></div>
                <div className="col-lg-3"><label className="form-label">Début</label><input type="datetime-local" name="validFrom" className="form-control" required /></div>
                <div className="col-lg-3"><label className="form-label">Fin</label><input type="datetime-local" name="validUntil" className="form-control" required /></div>
                <div className="col-12"><label className="form-label">Motif</label><input name="reason" className="form-control" minLength={3} maxLength={1000} required placeholder="Absence temporaire, suppléance match, déplacement…" /></div>
              </div>
              <div className="row g-3 mt-1">
                {permissionModules.map((module) => {
                  const available = module.permissions.filter((permission) => allowedDelegationPermissions.has(permission.key));
                  if (available.length === 0) return null;
                  return <div className="col-md-4" key={module.key}><div className="border rounded p-3 h-100"><strong className="d-block mb-2">{module.label}</strong>{available.map((permission) => <div className="form-check" key={permission.key}><input className="form-check-input" type="checkbox" name="permissions" value={permission.key} id={`delegate-${delegationScope}-${permission.key}`} /><label className="form-check-label" htmlFor={`delegate-${delegationScope}-${permission.key}`}>{permission.label}</label></div>)}</div></div>;
                })}
              </div>
              <button className="btn btn-primary mt-3" disabled={isPending}>Créer la délégation</button>
            </form>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h2 className="h6 mb-0">Délégations visibles</h2></div>
        <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>De</th><th>Vers</th><th>Portée</th><th>Permissions</th><th>Fenêtre</th><th>Statut</th><th>Action</th></tr></thead><tbody>
          {initialDelegations.map((delegation) => {
            const status = accessStatus(delegation.validFrom, delegation.validUntil, delegation.revokedAt);
            return <tr key={delegation.id}><td>{delegation.delegatorName}</td><td>{delegation.delegateeName}</td><td>{delegation.category ? AGE_CATEGORY_LABELS[delegation.category as keyof typeof AGE_CATEGORY_LABELS] ?? delegation.category : "Toutes"}</td><td><span className="small">{delegation.permissions.join(", ")}</span><div className="small text-muted">{delegation.reason}</div></td><td className="small">{formatDate(delegation.validFrom)} → {formatDate(delegation.validUntil)}</td><td><span className={`badge ${status.className}`}>{status.label}</span>{delegation.revocationReason && <div className="small text-muted mt-1">{delegation.revocationReason}</div>}</td><td>{delegation.canRevoke && !delegation.revokedAt && <button className="btn btn-outline-danger btn-sm" onClick={() => { const reason = window.prompt("Motif de révocation"); if (!reason?.trim()) return; const data = new FormData(); data.set("delegationId", String(delegation.id)); data.set("reason", reason.trim()); void run(() => revokeRoleDelegation(data)); }}>Révoquer</button>}</td></tr>;
          })}
          {initialDelegations.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">Aucune délégation visible</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}