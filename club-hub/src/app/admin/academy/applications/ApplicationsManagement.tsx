"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { updatePlayerApplicationStatus, deletePlayerApplication } from "./actions";

interface ApplicationData {
  id: number;
  childLastName: string;
  childFirstName: string;
  birthDate: string;
  category: string;
  position: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  message: string | null;
  documentUrl: string | null;
  status: "NEW" | "CONTACTED" | "TRIAL" | "ACCEPTED" | "REJECTED";
  adminNotes: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<ApplicationData["status"], string> = {
  NEW: "Nouvelle",
  CONTACTED: "Contactée",
  TRIAL: "Essai",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
};

const STATUS_BADGE: Record<ApplicationData["status"], string> = {
  NEW: "bg-primary",
  CONTACTED: "bg-info text-dark",
  TRIAL: "bg-warning text-dark",
  ACCEPTED: "bg-success",
  REJECTED: "bg-danger",
};

export function ApplicationsManagement({ initialApplications }: { initialApplications: ApplicationData[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const applications = initialApplications.filter((a) => statusFilter === "ALL" || a.status === statusFilter);

  async function handleUpdate(id: number, formData: FormData) {
    setLoading(true);
    try {
      await updatePlayerApplicationStatus(id, formData);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(application: ApplicationData) {
    const ok = await confirm(`Supprimer la candidature de ${application.childFirstName} ${application.childLastName} ?`, {
      variant: "danger",
    });
    if (!ok) return;
    await deletePlayerApplication(application.id);
    router.refresh();
  }

  return (
    <div>
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0">Candidatures reçues via le formulaire public /inscription.</p>
        <select className="form-select form-select-sm w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Enfant</th>
              <th>Catégorie</th>
              <th>Parent</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  Aucune candidature.
                </td>
              </tr>
            )}
            {applications.map((application) => (
              <React.Fragment key={application.id}>
                <tr>
                  <td>
                    {application.childFirstName} {application.childLastName}
                    <div className="small text-muted">Né(e) le {application.birthDate}</div>
                  </td>
                  <td>
                    {application.category}
                    {application.position && <div className="small text-muted">{application.position}</div>}
                  </td>
                  <td>
                    {application.parentName}
                    <div className="small text-muted">{application.parentPhone}</div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[application.status]}`}>{STATUS_LABELS[application.status]}</span>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => setExpandedId(expandedId === application.id ? null : application.id)}
                    >
                      {expandedId === application.id ? "Fermer" : "Traiter"}
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(application)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
                {expandedId === application.id && (
                  <tr>
                    <td colSpan={5}>
                      <form
                        className="card card-body row g-3 my-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleUpdate(application.id, new FormData(e.currentTarget));
                        }}
                      >
                        <div className="col-12">
                          <strong>Contact :</strong> {application.parentEmail} — {application.parentPhone}
                          {application.message && (
                            <div className="mt-2">
                              <strong>Message :</strong> {application.message}
                            </div>
                          )}
                          {application.documentUrl && (
                            <div className="mt-2">
                              <a href={application.documentUrl} target="_blank" rel="noreferrer">
                                Document / photo joint(e)
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">Statut</label>
                          <select name="status" className="form-select" defaultValue={application.status}>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 col-md-8">
                          <label className="form-label">Notes internes</label>
                          <textarea name="adminNotes" className="form-control" rows={2} defaultValue={application.adminNotes ?? ""} />
                        </div>
                        <div className="col-12">
                          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                            {loading ? "Enregistrement..." : "Mettre à jour"}
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
