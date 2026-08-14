"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS } from "@/types/categories";
import { createRole, updateRole, deleteRole, assignRoleToUser, removeRoleAssignment } from "./actions";

interface PermissionDef {
  key: string;
  label: string;
}
interface PermissionModule {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

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
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export function RolesManagement({
  initialRoles,
  initialAssignments,
  users,
  permissionModules,
}: {
  initialRoles: RoleData[];
  initialAssignments: AssignmentData[];
  users: UserOption[];
  permissionModules: PermissionModule[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [assignRoleId, setAssignRoleId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const openCreateForm = () => {
    setEditingRole(null);
    setSelectedPermissions([]);
    setIsGlobal(false);
    setShowRoleForm(true);
  };

  const openEditForm = (role: RoleData) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions);
    setIsGlobal(role.isGlobal);
    setShowRoleForm(true);
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  const toggleModule = (mod: PermissionModule) => {
    const keys = mod.permissions.map((p) => p.key);
    const allSelected = keys.every((k) => selectedPermissions.includes(k));
    setSelectedPermissions((prev) =>
      allSelected ? prev.filter((p) => !keys.includes(p)) : Array.from(new Set([...prev, ...keys]))
    );
  };

  const handleRoleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      selectedPermissions.forEach((p) => formData.append("permissions", p));

      const result = editingRole ? await updateRole(editingRole.id, formData) : await createRole(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowRoleForm(false);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: RoleData) => {
    if (!(await confirm(`Supprimer le rôle "${role.name}" ?`))) return;
    const result = await deleteRole(role.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAssigning(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await assignRoleToUser(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        e.currentTarget.reset();
        setAssignRoleId("");
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de l'attribution");
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignment: AssignmentData) => {
    if (!(await confirm(`Retirer le rôle "${assignment.roleName}" à ${assignment.userName} ?`))) return;
    const result = await removeRoleAssignment(assignment.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors du retrait");
    }
  };

  const selectedRoleForAssign = initialRoles.find((r) => String(r.id) === assignRoleId);

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Rôles & permissions</h1>
          <p className="text-muted mb-0">
            Créez des rôles (ex: Secrétaire, Coach) et attribuez-les aux comptes de votre club. Un rôle « global »
            donne accès à toutes les catégories ; sinon chaque attribution précise une catégorie (ex: Coach → U17).
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateForm}>
          <i className="fas fa-plus me-2" aria-hidden="true" />
          Nouveau rôle
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-4">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {showRoleForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">{editingRole ? `Modifier « ${editingRole.name} »` : "Nouveau rôle"}</h5>
            <button type="button" onClick={() => setShowRoleForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleRoleSubmit} className="row g-3">
              <div className="col-md-6">
                <label htmlFor="name" className="form-label">
                  Nom du rôle
                </label>
                <input type="text" id="name" name="name" className="form-control" required maxLength={100} defaultValue={editingRole?.name ?? ""} />
              </div>
              <div className="col-md-6">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <input type="text" id="description" name="description" className="form-control" maxLength={255} defaultValue={editingRole?.description ?? ""} />
              </div>
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isGlobal"
                    name="isGlobal"
                    checked={isGlobal}
                    onChange={(e) => setIsGlobal(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isGlobal">
                    Rôle global (accès à toutes les catégories — ex: Secrétaire Général, Trésorier)
                  </label>
                </div>
                {!isGlobal && (
                  <div className="form-text">
                    Rôle scopé par catégorie : chaque personne à qui il est attribué sera limitée à la catégorie choisie
                    (ex: « Coach » attribué à Amine pour U17).
                  </div>
                )}
              </div>

              <div className="col-12">
                <label className="form-label d-block">Permissions</label>
                <div className="row g-2">
                  {permissionModules.map((mod) => {
                    const keys = mod.permissions.map((p) => p.key);
                    const allSelected = keys.every((k) => selectedPermissions.includes(k));
                    return (
                      <div className="col-md-6 col-lg-4" key={mod.key}>
                        <div className="border rounded p-2 h-100">
                          <div className="form-check mb-1">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`mod-${mod.key}`}
                              checked={allSelected}
                              onChange={() => toggleModule(mod)}
                            />
                            <label className="form-check-label fw-semibold" htmlFor={`mod-${mod.key}`}>
                              {mod.label}
                            </label>
                          </div>
                          {mod.permissions.map((p) => (
                            <div className="form-check ms-3" key={p.key}>
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`perm-${p.key}`}
                                checked={selectedPermissions.includes(p.key)}
                                onChange={() => togglePermission(p.key)}
                              />
                              <label className="form-check-label small" htmlFor={`perm-${p.key}`}>
                                {p.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Enregistrement...
                    </>
                  ) : editingRole ? (
                    "Enregistrer"
                  ) : (
                    "Créer le rôle"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">Rôles du club</h5>
        </div>
        <div className="card-body">
          {initialRoles.length === 0 ? (
            <p className="text-muted mb-0">Aucun rôle créé</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Rôle</th>
                    <th>Portée</th>
                    <th>Permissions</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {initialRoles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <strong>{role.name}</strong>
                        {role.description && <div className="text-muted small">{role.description}</div>}
                      </td>
                      <td>
                        {role.isGlobal ? (
                          <span className="badge bg-primary-subtle text-primary">Toutes catégories</span>
                        ) : (
                          <span className="badge bg-info-subtle text-info">Par catégorie</span>
                        )}
                      </td>
                      <td>
                        <span className="text-muted small">{role.permissions.length} permission(s)</span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group" role="group">
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(role)}>
                            <i className="fas fa-edit" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteRole(role)}
                            disabled={isPending}
                          >
                            <i className="fas fa-trash" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">Attribuer un rôle</h5>
        </div>
        <div className="card-body">
          {users.length === 0 ? (
            <p className="text-muted mb-0">
              Aucun compte à qui attribuer un rôle. Créez d&apos;abord des comptes dans <strong>Utilisateurs</strong>.
            </p>
          ) : (
            <form onSubmit={handleAssignSubmit} className="row g-3 align-items-end">
              <div className="col-md-4">
                <label htmlFor="userId" className="form-label">
                  Personne
                </label>
                <select id="userId" name="userId" className="form-select" required defaultValue="">
                  <option value="" disabled>
                    Choisir une personne
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="roleId" className="form-label">
                  Rôle
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  className="form-select"
                  required
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(e.target.value)}
                >
                  <option value="" disabled>
                    Choisir un rôle
                  </option>
                  {initialRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.isGlobal ? "(global)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="category" className="form-label">
                  Catégorie
                </label>
                <select
                  id="category"
                  name="category"
                  className="form-select"
                  disabled={!selectedRoleForAssign || selectedRoleForAssign.isGlobal}
                  required={!!selectedRoleForAssign && !selectedRoleForAssign.isGlobal}
                  defaultValue=""
                >
                  <option value="" disabled>
                    {selectedRoleForAssign?.isGlobal ? "Toutes catégories" : "Choisir une catégorie"}
                  </option>
                  {AGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {AGE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-1">
                <button type="submit" className="btn btn-primary w-100" disabled={assigning}>
                  {assigning ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : <i className="fas fa-check" aria-hidden="true" />}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Attributions en cours</h5>
        </div>
        <div className="card-body">
          {initialAssignments.length === 0 ? (
            <p className="text-muted mb-0">Aucune attribution</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Personne</th>
                    <th>Rôle</th>
                    <th>Catégorie</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {initialAssignments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.userName}</td>
                      <td>{a.roleName}</td>
                      <td>{a.category ? AGE_CATEGORY_LABELS[a.category as keyof typeof AGE_CATEGORY_LABELS] ?? a.category : <span className="badge bg-primary-subtle text-primary">Toutes</span>}</td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveAssignment(a)} disabled={isPending}>
                          <i className="fas fa-times" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
