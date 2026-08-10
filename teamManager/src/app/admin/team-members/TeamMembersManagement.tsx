"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { createTeamMember, updateTeamMember, deleteTeamMember } from "./actions";

/**
 * Plain object type for TeamMember (serializable)
 */
export interface TeamMemberData {
  id: number;
  playerId: string | null;
  staffId: number | null;
  seasonId: number | null;
  internalTeamId: number | null;
  seasonName: string | null;
  squadName: string | null;
  status: "ACTIVE" | "SUSPENDED" | "ENDED";
  startDate: string;
  endDate: string | null;
  player?: {
    id: string;
    firstNameFr: string;
    lastNameFr: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
  } | null;
  staff?: {
    id: number;
    firstNameFr: string;
    lastNameFr: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
    staffType: string;
  } | null;
  createdAt: string;
}

/**
 * Plain object types for dropdowns
 */
export interface PlayerData {
  id: string;
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
}

export interface StaffData {
  id: number;
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  staffType: string;
}

export interface SeasonOption {
  id: number;
  name: string;
}

export interface SquadOption {
  id: number;
  name: string;
}

interface TeamMembersManagementProps {
  initialTeamMembers: TeamMemberData[];
  players: PlayerData[];
  staff: StaffData[];
  seasons: SeasonOption[];
  squads: SquadOption[];
}

type FormMode = "add" | "edit" | null;

/**
 * Team Members Management Component
 * Unified page with list and form on the same page
 * Allows adding either a player or staff member to a team
 */
export function TeamMembersManagement({
  initialTeamMembers,
  players,
  staff,
  seasons,
  squads,
}: TeamMembersManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>(initialTeamMembers);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingMember, setEditingMember] = useState<TeamMemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  // Sync local state with props when they change (after refresh)
  useEffect(() => {
    setTeamMembers(initialTeamMembers);
  }, [initialTeamMembers]);

  const [formData, setFormData] = useState({
    memberType: "PLAYER" as "PLAYER" | "STAFF",
    playerId: "",
    staffId: "",
    seasonId: "",
    internalTeamId: "",
    status: "ACTIVE" as "ACTIVE" | "SUSPENDED" | "ENDED",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      memberType: "PLAYER",
      playerId: "",
      staffId: "",
      seasonId: "",
      internalTeamId: "",
      status: "ACTIVE",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    });
    setFormMode(null);
    setEditingMember(null);
    setError(null);
    setSuccess(null);
  };

  // Handle add button click
  const handleAddClick = () => {
    resetForm();
    setFormMode("add");
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  // Handle edit button click
  const handleEditClick = (member: TeamMemberData) => {
    setEditingMember(member);
    const isPlayer = member.playerId !== null;
    setFormData({
      memberType: isPlayer ? "PLAYER" : "STAFF",
      playerId: member.playerId?.toString() || "",
      staffId: member.staffId?.toString() || "",
      seasonId: member.seasonId?.toString() || "",
      internalTeamId: member.internalTeamId?.toString() || "",
      status: member.status || "ACTIVE",
      startDate: formatDateForInput(member.startDate),
      endDate: formatDateForInput(member.endDate),
    });
    setFormMode("edit");
    setError(null);
    setSuccess(null);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append("memberType", formData.memberType);
      if (formData.memberType === "PLAYER") {
        formDataObj.append("playerId", formData.playerId);
      } else {
        formDataObj.append("staffId", formData.staffId);
      }
      formDataObj.append("seasonId", formData.seasonId);
      formDataObj.append("internalTeamId", formData.internalTeamId);
      formDataObj.append("status", formData.status);
      formDataObj.append("startDate", formData.startDate);
      formDataObj.append("endDate", formData.endDate);

      let result;
      if (formMode === "add") {
        result = await createTeamMember(formDataObj);
      } else if (formMode === "edit" && editingMember) {
        result = await updateTeamMember(editingMember.id, formDataObj);
      } else {
        return;
      }

      if (result.success) {
        setSuccess(result.message ?? null);
        resetForm();
        // Refresh the list using Next.js router
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(result.error || "Une erreur est survenue");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!(await confirm("Êtes-vous sûr de vouloir retirer ce membre de l'équipe ?"))) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteTeamMember(id);
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

  // Get member name display
  const getMemberName = (member: TeamMemberData): string => {
    if (member.player) {
      return `${member.player.firstNameFr} ${member.player.lastNameFr}`;
    }
    if (member.staff) {
      return `${member.staff.firstNameFr} ${member.staff.lastNameFr}`;
    }
    return "Membre inconnu";
  };

  // Get member type label
  const getMemberTypeLabel = (member: TeamMemberData): string => {
    if (member.playerId !== null) {
      return "Joueur";
    }
    if (member.staffId !== null) {
      return member.staff?.staffType || "Staff";
    }
    return "Inconnu";
  };

  const {
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    totalCount,
    items: visibleTeamMembers,
  } = useListFilter(teamMembers, {
    searchableText: (member) => `${getMemberName(member)} ${getMemberTypeLabel(member)}`,
  });

  return (
    <div className="container-fluid">
      {confirmDialog}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="mb-0">Gestion des Membres d'Équipe</h1>
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

      {/* Add Button - Always at right */}
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddClick}
            disabled={loading || isPending}
          >
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Ajouter un membre
          </button>
        </div>
      </div>

      {/* Add Form - Show before list when adding */}
      {formMode === "add" && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Ajouter un membre à l'équipe</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetForm}
                  aria-label="Fermer"
                />
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="memberType-add" className="form-label">
                        Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        id="memberType-add"
                        required
                        value={formData.memberType}
                        onChange={(e) => {
                          const newType = e.target.value as "PLAYER" | "STAFF";
                          setFormData({
                            ...formData,
                            memberType: newType,
                            playerId: newType === "PLAYER" ? formData.playerId : "",
                            staffId: newType === "STAFF" ? formData.staffId : "",
                          });
                        }}
                        disabled={loading}
                      >
                        <option value="PLAYER">Joueur</option>
                        <option value="STAFF">Staff</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label
                        htmlFor={formData.memberType === "PLAYER" ? "playerId-add" : "staffId-add"}
                        className="form-label"
                      >
                        {formData.memberType === "PLAYER" ? "Joueur" : "Staff"} <span className="text-danger">*</span>
                      </label>
                      {formData.memberType === "PLAYER" ? (
                        <select
                          className="form-select"
                          id="playerId-add"
                          required
                          value={formData.playerId}
                          onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
                          disabled={loading}
                        >
                          <option value="">Sélectionner un joueur</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.firstNameFr} {player.lastNameFr}
                              {player.firstNameAr && player.lastNameAr
                                ? ` (${player.firstNameAr} ${player.lastNameAr})`
                                : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="form-select"
                          id="staffId-add"
                          required
                          value={formData.staffId}
                          onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                          disabled={loading}
                        >
                          <option value="">Sélectionner un membre du staff</option>
                          {staff.map((staffMember) => (
                            <option key={staffMember.id} value={staffMember.id}>
                              {staffMember.firstNameFr} {staffMember.lastNameFr} ({staffMember.staffType})
                              {staffMember.firstNameAr && staffMember.lastNameAr
                                ? ` (${staffMember.firstNameAr} ${staffMember.lastNameAr})`
                                : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="status-add" className="form-label">
                        Statut <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        id="status-add"
                        required
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as "ACTIVE" | "SUSPENDED" | "ENDED",
                          })
                        }
                        disabled={loading}
                      >
                        <option value="ACTIVE">Actif</option>
                        <option value="SUSPENDED">Suspendu</option>
                        <option value="ENDED">Terminé</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="seasonId-add" className="form-label">
                        Saison
                      </label>
                      <select
                        className="form-select"
                        id="seasonId-add"
                        value={formData.seasonId}
                        onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                        disabled={loading}
                      >
                        <option value="">Non liée</option>
                        {seasons.map((season) => (
                          <option key={season.id} value={season.id}>
                            {season.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="internalTeamId-add" className="form-label">
                        Équipe interne
                      </label>
                      <select
                        className="form-select"
                        id="internalTeamId-add"
                        value={formData.internalTeamId}
                        onChange={(e) => setFormData({ ...formData, internalTeamId: e.target.value })}
                        disabled={loading}
                      >
                        <option value="">Non liée</option>
                        {squads.map((squad) => (
                          <option key={squad.id} value={squad.id}>
                            {squad.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="startDate-add" className="form-label">
                        Date de début <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        id="startDate-add"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="endDate-add" className="form-label">
                        Date de fin (optionnel)
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        id="endDate-add"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        disabled={loading}
                      />
                      <div className="form-text">Laisser vide si toujours actif</div>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          Création...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2" aria-hidden="true" />
                          Créer
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
                      disabled={loading}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {/* List Column - Always on left */}
        <div className={`col-12 ${formMode === "edit" ? "col-lg-7" : "col-lg-12"}`}>
          <div className="card">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h5 className="card-title mb-0">Liste des Membres d'Équipe</h5>
              <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un membre..." />
            </div>
            <div className="card-body">
              {teamMembers.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucun membre d'équipe enregistré</p>
                  <button type="button" className="btn btn-primary" onClick={handleAddClick}>
                    Ajouter le premier membre
                  </button>
                </div>
              ) : totalCount === 0 ? (
                <p className="text-muted text-center py-5 mb-0">Aucun membre ne correspond à votre recherche</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Membre</th>
                        <th>Type</th>
                        <th>Saison</th>
                        <th>Équipe interne</th>
                        <th>Statut</th>
                        <th>Date début</th>
                        <th>Date fin</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTeamMembers.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <strong>{getMemberName(member)}</strong>
                            {member.player?.firstNameAr && member.player?.lastNameAr && (
                              <div className="text-muted small">
                                {member.player.firstNameAr} {member.player.lastNameAr}
                              </div>
                            )}
                            {member.staff?.firstNameAr && member.staff?.lastNameAr && (
                              <div className="text-muted small">
                                {member.staff.firstNameAr} {member.staff.lastNameAr}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-primary">{getMemberTypeLabel(member)}</span>
                          </td>
                          <td>{member.seasonName ?? <span className="text-muted">-</span>}</td>
                          <td>{member.squadName ?? <span className="text-muted">-</span>}</td>
                          <td>
                            <span
                              className={`badge ${
                                member.status === "ACTIVE"
                                  ? "bg-success"
                                  : member.status === "SUSPENDED"
                                    ? "bg-warning"
                                    : "bg-secondary"
                              }`}
                            >
                              {member.status === "ACTIVE"
                                ? "Actif"
                                : member.status === "SUSPENDED"
                                  ? "Suspendu"
                                  : "Terminé"}
                            </span>
                          </td>
                          <td>{formatDateForInput(member.startDate)}</td>
                          <td>{member.endDate ? formatDateForInput(member.endDate) : <span className="text-muted">-</span>}</td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditClick(member)}
                                disabled={loading || isPending}
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(member.id)}
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
                  <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Column - Right when editing, only show for edit mode */}
        {formMode === "edit" && (
          <div className="col-12 col-lg-5 mt-4 mt-lg-0">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Modifier le membre d'équipe</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetForm}
                  aria-label="Fermer"
                />
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="memberType" className="form-label">
                      Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="memberType"
                      required
                      value={formData.memberType}
                      disabled={loading || true}
                    >
                      <option value="PLAYER">Joueur</option>
                      <option value="STAFF">Staff</option>
                    </select>
                    <div className="form-text">Le type ne peut pas être modifié</div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="status" className="form-label">
                      Statut <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="status"
                      required
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as "ACTIVE" | "SUSPENDED" | "ENDED",
                        })
                      }
                      disabled={loading}
                    >
                      <option value="ACTIVE">Actif</option>
                      <option value="SUSPENDED">Suspendu</option>
                      <option value="ENDED">Terminé</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="seasonId" className="form-label">
                      Saison
                    </label>
                    <select
                      className="form-select"
                      id="seasonId"
                      value={formData.seasonId}
                      onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                      disabled={loading}
                    >
                      <option value="">Non liée</option>
                      {seasons.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="internalTeamId" className="form-label">
                      Équipe interne
                    </label>
                    <select
                      className="form-select"
                      id="internalTeamId"
                      value={formData.internalTeamId}
                      onChange={(e) => setFormData({ ...formData, internalTeamId: e.target.value })}
                      disabled={loading}
                    >
                      <option value="">Non liée</option>
                      {squads.map((squad) => (
                        <option key={squad.id} value={squad.id}>
                          {squad.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="startDate" className="form-label">
                      Date de début <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      id="startDate"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="endDate" className="form-label">
                      Date de fin (optionnel)
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      id="endDate"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      disabled={loading}
                    />
                    <div className="form-text">Laisser vide si toujours actif</div>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check me-2" aria-hidden="true" />
                          Enregistrer
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
                      disabled={loading}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
