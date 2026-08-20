"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { createClubUser, updateClubUser, deleteClubUser } from "./actions";

interface ClubUserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  accessValidFrom: string | null;
  accessValidUntil: string | null;
  createdAt: string;
  roleLabels: string[];
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function formatInstant(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function describeAccess(user: ClubUserData): string {
  if (!user.isActive) return "Inactif";
  const now = Date.now();
  if (user.accessValidFrom && now < new Date(user.accessValidFrom).getTime()) {
    return `À partir du ${formatInstant(user.accessValidFrom)}`;
  }
  if (user.accessValidUntil && now >= new Date(user.accessValidUntil).getTime()) {
    return `Expiré le ${formatInstant(user.accessValidUntil)}`;
  }
  if (user.accessValidUntil) return `Jusqu’au ${formatInstant(user.accessValidUntil)}`;
  if (user.accessValidFrom) return `Depuis le ${formatInstant(user.accessValidFrom)}`;
  return "Permanent";
}

export function UsersManagement({ initialUsers }: { initialUsers: ClubUserData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ClubUserData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { search, setSearch, items: visibleUsers } = useListFilter(initialUsers, {
    searchableText: (u) => `${u.name} ${u.email} ${u.roleLabels.join(" ")}`,
  });

  const openCreateForm = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const openEditForm = (user: ClubUserData) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      for (const key of ["accessValidFrom", "accessValidUntil"] as const) {
        const raw = formData.get(key);
        if (typeof raw === "string" && raw.trim()) {
          const parsed = new Date(raw);
          if (Number.isNaN(parsed.getTime())) {
            setError("Date d'accès temporaire invalide");
            return;
          }
          formData.set(key, parsed.toISOString());
        }
      }

      const result = editingUser ? await updateClubUser(editingUser.id, formData) : await createClubUser(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowForm(false);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: ClubUserData) => {
    if (!(await confirm(`Supprimer le compte de ${user.name} ?`))) return;
    const result = await deleteClubUser(user.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const canLimitAccess = editingUser?.role !== "ADMIN";

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Utilisateurs du club</h1>
          <p className="text-muted mb-0">
            Créez des comptes pour votre staff (coachs, secrétaire...) puis attribuez-leur des rôles dans{" "}
            <Link href="/admin/roles">Rôles & permissions</Link>.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher une personne..." />
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Nouvelle personne
          </button>
        </div>
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

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">{editingUser ? `Modifier ${editingUser.name}` : "Nouvelle personne"}</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-6">
                <label htmlFor="name" className="form-label">Nom complet</label>
                <input type="text" id="name" name="name" className="form-control" required maxLength={191} defaultValue={editingUser?.name ?? ""} />
              </div>
              <div className="col-md-6">
                <label htmlFor="email" className="form-label">Email</label>
                <input type="email" id="email" name="email" className="form-control" required maxLength={191} defaultValue={editingUser?.email ?? ""} />
              </div>
              <div className="col-md-6">
                <label htmlFor="password" className="form-label">
                  Mot de passe {editingUser && <span className="text-muted small">(laisser vide pour ne pas changer)</span>}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-control"
                  minLength={8}
                  required={!editingUser}
                  placeholder="8 caractères minimum"
                />
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    defaultChecked={editingUser?.isActive ?? true}
                  />
                  <label className="form-check-label" htmlFor="isActive">Compte actif</label>
                </div>
              </div>

              <div className="col-12">
                <hr className="my-1" />
                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
                  <div>
                    <div className="fw-semibold">Accès temporaire</div>
                    <div className="text-muted small">Optionnel. Toute modification déconnecte les sessions existantes.</div>
                  </div>
                  {!canLimitAccess && <span className="badge bg-secondary-subtle text-secondary">Non applicable à l’administrateur</span>}
                </div>
              </div>
              <div className="col-md-6">
                <label htmlFor="accessValidFrom" className="form-label">Valide à partir de</label>
                <input
                  type="datetime-local"
                  id="accessValidFrom"
                  name="accessValidFrom"
                  className="form-control"
                  defaultValue={toDatetimeLocal(editingUser?.accessValidFrom ?? null)}
                  disabled={!canLimitAccess}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="accessValidUntil" className="form-label">Valide jusqu’au</label>
                <input
                  type="datetime-local"
                  id="accessValidUntil"
                  name="accessValidUntil"
                  className="form-control"
                  defaultValue={toDatetimeLocal(editingUser?.accessValidUntil ?? null)}
                  disabled={!canLimitAccess}
                />
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Enregistrement...
                    </>
                  ) : editingUser ? "Enregistrer" : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {initialUsers.length === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucun compte pour ce club</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Rôles attribués</th>
                    <th>Statut</th>
                    <th>Accès</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-medium">{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        {u.role === "ADMIN" ? (
                          <span className="badge bg-danger-subtle text-danger">Administrateur du club</span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">Membre</span>
                        )}
                      </td>
                      <td>
                        {u.roleLabels.length === 0 ? (
                          <span className="text-muted small">Aucun rôle</span>
                        ) : (
                          u.roleLabels.map((label, i) => (
                            <span key={i} className="badge bg-info-subtle text-info me-1">{label}</span>
                          ))
                        )}
                      </td>
                      <td>
                        {u.isActive ? (
                          <span className="badge bg-success-subtle text-success">Actif</span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">Inactif</span>
                        )}
                      </td>
                      <td><span className="small">{describeAccess(u)}</span></td>
                      <td className="text-end">
                        <div className="btn-group" role="group">
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(u)}>
                            <i className="fas fa-edit" aria-hidden="true" />
                          </button>
                          {u.role !== "ADMIN" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(u)}
                              disabled={isPending}
                            >
                              <i className="fas fa-trash" aria-hidden="true" />
                            </button>
                          )}
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
    </div>
  );
}