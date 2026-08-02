"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMediaItem, updateMediaItem, deleteMediaItem } from "./actions";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { MediaPreview } from "@/components/admin/MediaPreview";

/**
 * Plain object type for MediaItem (serializable)
 */
interface MediaItemData {
  id: number;
  uploaderId: number | null;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
  mimeType: string | null;
  altTextFr: string | null;
  altTextAr: string | null;
  createdAt: string;
}

interface MediaItemsManagementProps {
  initialMediaItems: MediaItemData[];
}

type FormMode = "add" | "edit" | null;

/**
 * Media Items Management Component
 * Unified page with list and form on the same page
 * Responsive layout: form on right (desktop) or bottom (mobile)
 */
export function MediaItemsManagement({ initialMediaItems }: MediaItemsManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mediaItems, setMediaItems] = useState<MediaItemData[]>(initialMediaItems);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingItem, setEditingItem] = useState<MediaItemData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ path: string; type: string; mimeType: string } | null>(null);

  // Sync local state with props when they change (after refresh)
  useEffect(() => {
    setMediaItems(initialMediaItems);
  }, [initialMediaItems]);

  const [formData, setFormData] = useState({
    url: "",
    type: "IMAGE" as "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO",
    mimeType: "",
    altTextFr: "",
    altTextAr: "",
  });

  // Reset form
  const resetForm = () => {
    setFormData({ url: "", type: "IMAGE", mimeType: "", altTextFr: "", altTextAr: "" });
    setFormMode(null);
    setEditingItem(null);
    setError(null);
    setSuccess(null);
    setUploadedFile(null);
  };

  // Handle add button click
  const handleAddClick = () => {
    resetForm();
    setFormMode("add");
  };

  // Handle edit button click
  const handleEditClick = (item: MediaItemData) => {
    setEditingItem(item);
    setFormData({
      url: item.url,
      type: item.type,
      mimeType: item.mimeType || "",
      altTextFr: item.altTextFr || "",
      altTextAr: item.altTextAr || "",
    });
    setFormMode("edit");
    setError(null);
    setSuccess(null);
    setUploadedFile(null);
  };

  // Handle upload complete
  const handleUploadComplete = (result: { path: string; type: string; mimeType: string }) => {
    setUploadedFile(result);
    setFormData((prev) => ({
      ...prev,
      url: result.path,
      type: result.type as "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO",
      mimeType: result.mimeType,
    }));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append("url", formData.url);
      formDataObj.append("type", formData.type);
      if (formData.mimeType) formDataObj.append("mimeType", formData.mimeType);
      if (formData.altTextFr) formDataObj.append("altTextFr", formData.altTextFr);
      if (formData.altTextAr) formDataObj.append("altTextAr", formData.altTextAr);

      let result;
      if (formMode === "add") {
        result = await createMediaItem(formDataObj);
      } else if (formMode === "edit" && editingItem) {
        result = await updateMediaItem(editingItem.id, formDataObj);
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément média ?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteMediaItem(id);
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

  // Get type label
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      IMAGE: "Image",
      VIDEO: "Vidéo",
      DOCUMENT: "Document",
      AUDIO: "Audio",
    };
    return labels[type] || type;
  };

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="mb-0">Gestion des Médias</h1>
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
            Ajouter un média
          </button>
        </div>
      </div>

      {/* Add Form */}
      {formMode === "add" && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Ajouter un média</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetForm}
                  aria-label="Fermer"
                />
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <MediaUploader
                    onUploadComplete={handleUploadComplete}
                    onError={(err) => setError(err)}
                    acceptedTypes="ALL"
                  />

                  {formData.url && (
                    <div className="mb-3">
                      <label className="form-label">Aperçu</label>
                      <div>
                        <MediaPreview
                          url={formData.url}
                          type={formData.type}
                          altText={formData.altTextFr || undefined}
                        />
                      </div>
                    </div>
                  )}

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="altTextFr-add" className="form-label">
                        Texte alternatif (français)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="altTextFr-add"
                        maxLength={255}
                        value={formData.altTextFr}
                        onChange={(e) => setFormData({ ...formData, altTextFr: e.target.value })}
                        placeholder="Description de l'image"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="altTextAr-add" className="form-label">
                        Texte alternatif (arabe)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="altTextAr-add"
                        maxLength={255}
                        value={formData.altTextAr}
                        onChange={(e) => setFormData({ ...formData, altTextAr: e.target.value })}
                        placeholder="وصف الصورة"
                        dir="rtl"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={loading || !formData.url}>
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
            <div className="card-header">
              <h5 className="card-title mb-0">Liste des Médias</h5>
            </div>
            <div className="card-body">
              {mediaItems.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucun média enregistré</p>
                  <button type="button" className="btn btn-primary" onClick={handleAddClick}>
                    Ajouter le premier média
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Aperçu</th>
                        <th>Texte alternatif (FR)</th>
                        <th>Texte alternatif (AR)</th>
                        <th>Date de création</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mediaItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span className="badge bg-primary">{getTypeLabel(item.type)}</span>
                          </td>
                          <td>
                            <MediaPreview
                              url={item.url}
                              type={item.type}
                              altText={item.altTextFr || undefined}
                              className="m-0"
                            />
                          </td>
                          <td>{item.altTextFr || <span className="text-muted">-</span>}</td>
                          <td>{item.altTextAr || <span className="text-muted">-</span>}</td>
                          <td>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditClick(item)}
                                disabled={loading || isPending}
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(item.id)}
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

        {/* Edit Form Column */}
        {formMode === "edit" && (
          <div className="col-12 col-lg-5 mt-4 mt-lg-0">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Modifier le média</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={resetForm}
                  aria-label="Fermer"
                />
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {formData.url && (
                    <div className="mb-3">
                      <label className="form-label">Aperçu</label>
                      <div>
                        <MediaPreview
                          url={formData.url}
                          type={formData.type}
                          altText={formData.altTextFr || undefined}
                        />
                      </div>
                      <div className="form-text">URL: {formData.url}</div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="url" className="form-label">
                      URL <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="url"
                      required
                      maxLength={255}
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="type" className="form-label">
                      Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="type"
                      required
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" })
                      }
                      disabled={loading}
                    >
                      <option value="IMAGE">Image</option>
                      <option value="VIDEO">Vidéo</option>
                      <option value="DOCUMENT">Document</option>
                      <option value="AUDIO">Audio</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="mimeType" className="form-label">
                      Type MIME
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="mimeType"
                      maxLength={100}
                      value={formData.mimeType}
                      onChange={(e) => setFormData({ ...formData, mimeType: e.target.value })}
                      placeholder="Ex: image/jpeg"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="altTextFr" className="form-label">
                      Texte alternatif (français)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="altTextFr"
                      maxLength={255}
                      value={formData.altTextFr}
                      onChange={(e) => setFormData({ ...formData, altTextFr: e.target.value })}
                      placeholder="Description de l'image"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="altTextAr" className="form-label">
                      Texte alternatif (arabe)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="altTextAr"
                      maxLength={255}
                      value={formData.altTextAr}
                      onChange={(e) => setFormData({ ...formData, altTextAr: e.target.value })}
                      placeholder="وصف الصورة"
                      dir="rtl"
                      disabled={loading}
                    />
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

