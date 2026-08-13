"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { deletePlayer } from "./actions";

type PlayerStatus = "TITULAR" | "SUBSTITUTE" | "BLANK" | "ENTERING" | "OUT_OF_LIST" | "SUSPENDED";

const statusLabels: Record<PlayerStatus, string> = {
  TITULAR: "Titulaire",
  SUBSTITUTE: "Remplaçant",
  BLANK: "Blanc",
  ENTERING: "Rentrant",
  OUT_OF_LIST: "Hors liste",
  SUSPENDED: "Suspendu",
};

const statusBadgeClass: Record<PlayerStatus, string> = {
  TITULAR: "bg-success",
  SUBSTITUTE: "bg-primary",
  BLANK: "bg-secondary",
  ENTERING: "bg-info",
  OUT_OF_LIST: "bg-dark",
  SUSPENDED: "bg-danger",
};

/**
 * Plain object type for Player (serializable)
 */
interface PlayerData {
  id: string;
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  number: number;
  status: PlayerStatus;
  isActive: boolean;
  birthDate: string | null;
  position: string | null;
  imageUrl: string | null;
  category: AgeCategory;
  createdAt: string;
  updatedAt: string | null;
}

interface PlayersListProps {
  initialPlayers: PlayerData[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Players List Component
 * Displays the list of players with actions
 */
export function PlayersList({ initialPlayers, canCreate, canEdit, canDelete }: PlayersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [players] = useState<PlayerData[]>(initialPlayers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();
  const {
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    totalCount,
    items: visiblePlayers,
  } = useListFilter(players, {
    searchableText: (p) =>
      `${p.firstNameFr} ${p.lastNameFr} ${p.firstNameAr ?? ""} ${p.lastNameAr ?? ""} ${p.number}`,
  });

  // Calculate age from birth date
  const calculateAge = (birthDate: string | null): string => {
    if (!birthDate) return "-";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} ans`;
  };

  // Get position label
  const getPositionLabel = (position: string | null): string => {
    const labels: Record<string, string> = {
      GOALKEEPER: "Gardien",
      DEFENDER: "Défenseur",
      MIDFIELDER: "Milieu",
      FORWARD: "Attaquant",
    };
    return position ? labels[position] || position : "-";
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!(await confirm("Êtes-vous sûr de vouloir supprimer ce joueur ?"))) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deletePlayer(id);
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
      {confirmDialog}
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="mb-0">Gestion des Joueurs</h1>
          <div className="d-flex gap-2">
            <Link href="/admin/players/transfers" className="btn btn-outline-secondary">
              <i className="bx bx-transfer me-2" aria-hidden="true" />
              Historique des transferts
            </Link>
            {canCreate && (
              <Link href="/admin/players/create" className="btn btn-primary">
                <i className="fas fa-plus me-2" aria-hidden="true" />
                Ajouter un joueur
              </Link>
            )}
          </div>
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
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h5 className="card-title mb-0">Liste des Joueurs</h5>
              <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un joueur..." />
            </div>
            <div className="card-body">
              {players.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucun joueur enregistré</p>
                  {canCreate && (
                    <Link href="/admin/players/create" className="btn btn-primary">
                      Ajouter le premier joueur
                    </Link>
                  )}
                </div>
              ) : totalCount === 0 ? (
                <p className="text-muted text-center py-5 mb-0">Aucun joueur ne correspond à votre recherche</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Nom complet</th>
                        <th>Catégorie</th>
                        <th>Position</th>
                        <th>Numéro</th>
                        <th>Statut</th>
                        <th>Âge</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePlayers.map((player) => (
                        <tr key={player.id} className={player.isActive ? undefined : "skote-row-inactive"}>
                          <td>
                            {player.imageUrl ? (
                              <ImageWithFallback
                                src={player.imageUrl}
                                alt={`${player.firstNameFr} ${player.lastNameFr}`}
                                className="rounded skote-avatar-img"
                                fallbackIcon="fas fa-user text-white"
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
                              {player.firstNameFr} {player.lastNameFr}
                            </strong>
                            {player.firstNameAr && player.lastNameAr && (
                              <div className="text-muted small">
                                {player.firstNameAr} {player.lastNameAr}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-primary-subtle text-primary">{AGE_CATEGORY_LABELS[player.category]}</span>
                          </td>
                          <td>
                            <span className="badge bg-info">{getPositionLabel(player.position)}</span>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{player.number}</span>
                          </td>
                          <td>
                            <span className={`badge ${statusBadgeClass[player.status]}`}>{statusLabels[player.status]}</span>
                          </td>
                          <td>{calculateAge(player.birthDate)}</td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              {canEdit && (
                                <Link
                                  href={`/admin/players/${player.id}/edit`}
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  <i className="fas fa-edit" aria-hidden="true" />
                                  <span className="visually-hidden">Modifier</span>
                                </Link>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(player.id)}
                                  disabled={loading || isPending}
                                >
                                  <i className="fas fa-trash" aria-hidden="true" />
                                  <span className="visually-hidden">Supprimer</span>
                                </button>
                              )}
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
      </div>
    </div>
  );
}
