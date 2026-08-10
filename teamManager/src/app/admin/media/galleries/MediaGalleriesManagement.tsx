"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMediaGallery, updateMediaGallery, deleteMediaGallery } from "./actions";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { MediaPreview } from "@/components/admin/MediaPreview";

/**
 * Plain object type for MediaGallery (serializable)
 */
interface MediaGalleryData {
  id: number;
  titleFr: string;
  titleAr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  coverImageId: number | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface MediaItemData {
  id: number;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
}

interface MediaGalleriesManagementProps {
  initialGalleries: MediaGalleryData[];
  availableMediaItems: MediaItemData[];
}

type FormMode = "add" | "edit" | null;

/**
 * Media Galleries Management Component
 * Unified page with list and form on the same page
 * Responsive layout: form on right (desktop) or bottom (mobile)
 */
export function MediaGalleriesManagement({ initialGalleries, availableMediaItems }: MediaGalleriesManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [galleries, setGalleries] = useState<MediaGalleryData[]>(initialGalleries);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingGallery, setEditingGallery] = useState<MediaGalleryData | null>(null);
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
    items: visibleGalleries,
  } = useListFilter(galleries, {
    searchableText: (g) => `${g.titleFr} ${g.titleAr ?? ""}`,
  });

  // Sync local state with props when they change (after refresh)
  useEffect(() => {
    setGalleries(initialGalleries);
  }, [initialGalleries]);

  const [formData, setFormData] = useState({
    titleFr: "",
    titleAr: "",
    descriptionFr: "",
    descriptionAr: "",
    coverImageId: "",
    isPublic: true,
  });

  // Reset form
  const resetForm = () => {
    setFormData({ titleFr: "", titleAr: "", descriptionFr: "", descriptionAr: "", coverImageId: "", isPublic: true });
    setFormMode(null);
    setEditingGallery(null);
    setError(null);
    setSuccess(null);
  };

  // Handle add button click
  const handleAddClick = () => {
    resetForm();
    setFormMode("add");
  };

  // Handle edit button click
  const handleEditClick = (gallery: MediaGalleryData) => {
    setEditingGallery(gallery);
    setFormData({
      titleFr: gallery.titleFr,
      titleAr: gallery.titleAr || "",
      descriptionFr: gallery.descriptionFr || "",
      descriptionAr: gallery.descriptionAr || "",
      coverImageId: gallery.coverImageId?.toString() || "",
      isPublic: gallery.isPublic,
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
      formDataObj.append("titleFr", formData.titleFr);
      if (formData.titleAr) formDataObj.append("titleAr", formData.titleAr);
      if (formData.descriptionFr) formDataObj.append("descriptionFr", formData.descriptionFr);
      if (formData.descriptionAr) formDataObj.append("descriptionAr", formData.descriptionAr);
      if (formData.coverImageId) formDataObj.append("coverImageId", formData.coverImageId);
      formDataObj.append("isPublic", formData.isPublic.toString());

      let result;
      if (formMode === "add") {
        result = await createMediaGallery(formDataObj);
      } else if (formMode === "edit" && editingGallery) {
        result = await updateMediaGallery(editingGallery.id, formDataObj);
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
    if (!(await confirm("Êtes-vous sûr de vouloir supprimer cette galerie ?"))) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteMediaGallery(id);
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

  // Get selected cover image
  const selectedCoverImage = availableMediaItems.find((item) => item.id.toString() === formData.coverImageId);

  return (
    <div className="container-fluid">
      {confirmDialog}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="mb-0">Gestion des Galeries</h1>
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

      {/* Add Button */}
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddClick}
            disabled={loading || isPending}
          >
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Ajouter une galerie
          </button>
        </div>
      </div>

      {/* Add Form */}
      {formMode === "add" && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Ajouter une galerie</h5>
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
                      <label htmlFor="titleFr-add" className="form-label">
                        Titre en français <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="titleFr-add"
                        required
                        maxLength={200}
                        value={formData.titleFr}
                        onChange={(e) => setFormData({ ...formData, titleFr: e.target.value })}
                        placeholder="Ex: Galerie des matchs"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="titleAr-add" className="form-label">
                        Titre en arabe
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="titleAr-add"
                        maxLength={200}
                        value={formData.titleAr}
                        onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                        placeholder="Ex: معرض المباريات"
                        dir="rtl"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="descriptionFr-add" className="form-label">
                        Description (français)
                      </label>
                      <textarea
                        className="form-control"
                        id="descriptionFr-add"
                        rows={3}
                        value={formData.descriptionFr}
                        onChange={(e) => setFormData({ ...formData, descriptionFr: e.target.value })}
                        placeholder="Description de la galerie"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="descriptionAr-add" className="form-label">
                        Description (arabe)
                      </label>
                      <textarea
                        className="form-control"
                        id="descriptionAr-add"
                        rows={3}
                        value={formData.descriptionAr}
                        onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                        placeholder="وصف المعرض"
                        dir="rtl"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="coverImageId-add" className="form-label">
                      Image de couverture
                    </label>
                    <select
                      className="form-select"
                      id="coverImageId-add"
                      value={formData.coverImageId}
                      onChange={(e) => setFormData({ ...formData, coverImageId: e.target.value })}
                      disabled={loading}
                    >
                      <option value="">Aucune image</option>
                      {availableMediaItems
                        .filter((item) => item.type === "IMAGE")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.url}
                          </option>
                        ))}
                    </select>
                    {selectedCoverImage && (
                      <div className="mt-2">
                        <MediaPreview
                          url={selectedCoverImage.url}
                          type="IMAGE"
                          className="d-block"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isPublic-add"
                        checked={formData.isPublic}
                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="isPublic-add">
                        Galerie publique
                      </label>
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
        {/* List Column */}
        <div className={`col-12 ${formMode === "edit" ? "col-lg-7" : "col-lg-12"}`}>
          <div className="card">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h5 className="card-title mb-0">Liste des Galeries</h5>
              <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher une galerie..." />
            </div>
            <div className="card-body">
              {galleries.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucune galerie enregistrée</p>
                  <button type="button" className="btn btn-primary" onClick={handleAddClick}>
                    Ajouter la première galerie
                  </button>
                </div>
              ) : totalCount === 0 ? (
                <p className="text-muted text-center py-5 mb-0">Aucune galerie ne correspond à votre recherche</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Image de couverture</th>
                        <th>Titre (FR)</th>
                        <th>Titre (AR)</th>
                        <th>Public</th>
                        <th>Date de création</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleGalleries.map((gallery) => (
                        <tr key={gallery.id}>
                          <td>
                            {gallery.coverImageUrl ? (
                              <MediaPreview
                                url={gallery.coverImageUrl}
                                type="IMAGE"
                                className="m-0"
                              />
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>{gallery.titleFr}</td>
                          <td>{gallery.titleAr || <span className="text-muted">-</span>}</td>
                          <td>
                            {gallery.isPublic ? (
                              <span className="badge bg-success">Public</span>
                            ) : (
                              <span className="badge bg-secondary">Privé</span>
                            )}
                          </td>
                          <td>{new Date(gallery.createdAt).toLocaleDateString("fr-FR")}</td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditClick(gallery)}
                                disabled={loading || isPending}
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(gallery.id)}
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

        {/* Edit Form Column */}
        {formMode === "edit" && (
          <div className="col-12 col-lg-5 mt-4 mt-lg-0">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Modifier la galerie</h5>
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
                    <label htmlFor="titleFr" className="form-label">
                      Titre en français <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="titleFr"
                      required
                      maxLength={200}
                      value={formData.titleFr}
                      onChange={(e) => setFormData({ ...formData, titleFr: e.target.value })}
                      placeholder="Ex: Galerie des matchs"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="titleAr" className="form-label">
                      Titre en arabe
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="titleAr"
                      maxLength={200}
                      value={formData.titleAr}
                      onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                      placeholder="Ex: معرض المباريات"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="descriptionFr" className="form-label">
                      Description (français)
                    </label>
                    <textarea
                      className="form-control"
                      id="descriptionFr"
                      rows={3}
                      value={formData.descriptionFr}
                      onChange={(e) => setFormData({ ...formData, descriptionFr: e.target.value })}
                      placeholder="Description de la galerie"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="descriptionAr" className="form-label">
                      Description (arabe)
                    </label>
                    <textarea
                      className="form-control"
                      id="descriptionAr"
                      rows={3}
                      value={formData.descriptionAr}
                      onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                      placeholder="وصف المعرض"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="coverImageId" className="form-label">
                      Image de couverture
                    </label>
                    <select
                      className="form-select"
                      id="coverImageId"
                      value={formData.coverImageId}
                      onChange={(e) => setFormData({ ...formData, coverImageId: e.target.value })}
                      disabled={loading}
                    >
                      <option value="">Aucune image</option>
                      {availableMediaItems
                        .filter((item) => item.type === "IMAGE")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.url}
                          </option>
                        ))}
                    </select>
                    {selectedCoverImage && (
                      <div className="mt-2">
                        <MediaPreview
                          url={selectedCoverImage.url}
                          type="IMAGE"
                          className="d-block"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isPublic"
                        checked={formData.isPublic}
                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="isPublic">
                        Galerie publique
                      </label>
                    </div>
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

