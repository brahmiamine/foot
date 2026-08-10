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
  createdAt: string;
  roleLabels: string[];
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
                <label htmlFor="name" className="form-label">
                  Nom complet
                </label>
                <input type="text" id="name" name="name" className="form-control" required maxLength={191} defaultValue={editingUser?.name ?? ""} />
              </div>
              <div className="col-md-6">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
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
                  <label className="form-check-label" htmlFor="isActive">
                    Compte actif
                  </label>
                </div>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Enregistrement...
                    </>
                  ) : editingUser ? (
                    "Enregistrer"
                  ) : (
                    "Créer le compte"
                  )}
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
                            <span key={i} className="badge bg-info-subtle text-info me-1">
                              {label}
                            </span>
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
