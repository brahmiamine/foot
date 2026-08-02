"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteStaff } from "./actions";

/**
 * Plain object type for Staff (serializable)
 */
interface StaffData {
  id: number;
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  birthDate: string;
  phone: string | null;
  imageUrl: string | null;
  staffType: string;
  userId: number | null;
  createdAt: string;
  updatedAt: string | null;
}

interface StaffListProps {
  initialStaff: StaffData[];
}

/**
 * Staff List Component
 * Displays the list of staff members with actions
 */
export function StaffList({ initialStaff }: StaffListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [staff] = useState<StaffData[]>(initialStaff);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculate age from birth date
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Get staff type label
  const getStaffTypeLabel = (staffType: string): string => {
    const labels: Record<string, string> = {
      COACH: "Entraîneur",
      ADJOINT: "Adjoint",
      KINE: "Kinésithérapeute",
      MEDECIN: "Médecin",
      PREPARATEUR: "Préparateur physique",
      ANALYSTE: "Analyste",
      EQUIPEMENTIER: "Équipementier",
      COMMUNICATION: "Communication",
      AUTRE: "Autre",
    };
    return labels[staffType] || staffType;
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce membre du staff ?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteStaff(id);
      if (result.success) {
        setSuccess(result.message ?? null);
        // Refresh the list using Next.js router
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="mb-0">Gestion du Staff</h1>
          <Link href="/admin/staff/create" className="btn btn-primary">
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Ajouter un membre du staff
          </Link>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-circle me-2" aria-hidden="true" />
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
            aria-label="Fermer"
          />
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2" aria-hidden="true" />
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess(null)}
            aria-label="Fermer"
          />
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Liste du Staff</h5>
            </div>
            <div className="card-body">
              {staff.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucun membre du staff enregistré</p>
                  <Link href="/admin/staff/create" className="btn btn-primary">
                    Ajouter le premier membre du staff
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Nom complet</th>
                        <th>Type</th>
                        <th>Téléphone</th>
                        <th>Âge</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((staffMember) => (
                        <tr key={staffMember.id}>
                          <td>
                            {staffMember.imageUrl ? (
                              <img
                                src={staffMember.imageUrl}
                                alt={`${staffMember.firstNameFr} ${staffMember.lastNameFr}`}
                                className="rounded skote-avatar-img"
                              />
                            ) : (
                              <div
                                className="rounded bg-secondary d-flex align-items-center justify-content-center skote-avatar-placeholder"
                              >
                                <i className="fas fa-user text-white" aria-hidden="true" />
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>
                              {staffMember.firstNameFr} {staffMember.lastNameFr}
                            </strong>
                            {staffMember.firstNameAr && staffMember.lastNameAr && (
                              <div className="text-muted small">
                                {staffMember.firstNameAr} {staffMember.lastNameAr}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-info">{getStaffTypeLabel(staffMember.staffType)}</span>
                          </td>
                          <td>{staffMember.phone || <span className="text-muted">-</span>}</td>
                          <td>{calculateAge(staffMember.birthDate)} ans</td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <Link
                                href={`/admin/staff/${staffMember.id}/edit`}
                                className="btn btn-sm btn-outline-primary"
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </Link>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(staffMember.id)}
                                disabled={loading || isPending}
                              >
                                <i className="fas fa-trash" aria-hidden="true" />
                                <span className="visually-hidden">Supprimer</span>
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
        </div>
      </div>
    </div>
  );
}

