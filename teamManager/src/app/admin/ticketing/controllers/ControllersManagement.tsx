"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { createController, assignController, updateControllerGate, removeController } from "./actions";

interface ControllerData {
  id: number;
  userName: string;
  userEmail: string;
  gate: string | null;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export function ControllersManagement({ initialControllers, eligibleUsers }: { initialControllers: ControllerData[]; eligibleUsers: UserOption[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [mode, setMode] = useState<"none" | "new" | "existing">("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = mode === "new" ? await createController(formData) : await assignController(formData);
      if (result.success) {
        setMode("none");
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGateChange = async (id: number, gate: string) => {
    const result = await updateControllerGate(id, gate || null);
    if (result.success) startTransition(() => router.refresh());
  };

  const handleRemove = async (controller: ControllerData) => {
    if (!(await confirm(`Retirer "${controller.userName}" des contrôleurs ? Il perdra l'accès au scan.`))) return;
    const result = await removeController(controller.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors du retrait");
    }
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Contrôleurs</h1>
          <p className="text-muted mb-0">Comptes staff autorisés à scanner les billets à l&apos;entrée — accès limité, aucun autre module admin.</p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-primary" onClick={() => setMode(mode === "existing" ? "none" : "existing")}>
            Attribuer un compte existant
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setMode(mode === "new" ? "none" : "new")}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Nouveau contrôleur
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {mode === "new" && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Nouveau contrôleur</h5>
            <button type="button" onClick={() => setMode("none")} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-4">
                <label htmlFor="name" className="form-label">
                  Nom <span className="text-danger">*</span>
                </label>
                <input type="text" id="name" name="name" className="form-control" required maxLength={191} />
              </div>
              <div className="col-md-4">
                <label htmlFor="email" className="form-label">
                  Email <span className="text-danger">*</span>
                </label>
                <input type="email" id="email" name="email" className="form-control" required />
              </div>
              <div className="col-md-4">
                <label htmlFor="password" className="form-label">
                  Mot de passe <span className="text-danger">*</span>
                </label>
                <input type="password" id="password" name="password" className="form-control" required minLength={6} />
              </div>
              <div className="col-md-4">
                <label htmlFor="gate" className="form-label">
                  Porte (optionnel)
                </label>
                <input type="text" id="gate" name="gate" className="form-control" maxLength={50} placeholder="Ex: Porte A" />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  Créer le contrôleur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mode === "existing" && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Attribuer un compte existant</h5>
            <button type="button" onClick={() => setMode("none")} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            {eligibleUsers.length === 0 ? (
              <p className="text-muted small mb-0">Aucun compte staff disponible (créez-en un via Utilisateurs, ou utilisez &quot;Nouveau contrôleur&quot;).</p>
            ) : (
              <form onSubmit={handleSubmit} className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="userId" className="form-label">
                    Compte <span className="text-danger">*</span>
                  </label>
                  <select id="userId" name="userId" className="form-select" required defaultValue="">
                    <option value="" disabled>
                      Choisir
                    </option>
                    {eligibleUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="gate2" className="form-label">
                    Porte (optionnel)
                  </label>
                  <input type="text" id="gate2" name="gate" className="form-control" maxLength={50} placeholder="Ex: Porte A" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    Attribuer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {initialControllers.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun contrôleur configuré</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Porte</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialControllers.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.userName}</td>
                    <td>{c.userEmail}</td>
                    <td style={{ maxWidth: 160 }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        defaultValue={c.gate ?? ""}
                        placeholder="Ex: Porte A"
                        onBlur={(e) => {
                          if (e.target.value !== (c.gate ?? "")) handleGateChange(c.id, e.target.value);
                        }}
                      />
                    </td>
                    <td className="text-end">
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemove(c)}>
                        <i className="fas fa-trash" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
