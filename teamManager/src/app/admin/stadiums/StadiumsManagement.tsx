"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStadium, updateStadium, deleteStadium } from "./actions";

/**
 * Plain object type for Stadium (serializable)
 */
interface StadiumData {
  id: number;
  nameFr: string;
  nameAr: string | null;
  addressFr: string | null;
  addressAr: string | null;
  cityFr: string | null;
  cityAr: string | null;
  isHome: boolean;
  capacity: number | null;
  imageUrl: string | null;
  createdAt: string;
}

interface StadiumsManagementProps {
  initialStadiums: StadiumData[];
}

type FormMode = "add" | "edit" | null;

/**
 * Stadiums Management Component
 * Unified page with list and form on the same page
 * Responsive layout: form on right (desktop) or bottom (mobile)
 */
export function StadiumsManagement({ initialStadiums }: StadiumsManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stadiums, setStadiums] = useState<StadiumData[]>(initialStadiums);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingStadium, setEditingStadium] = useState<StadiumData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync local state with props when they change (after refresh)
  useEffect(() => {
    setStadiums(initialStadiums);
  }, [initialStadiums]);

  const [formData, setFormData] = useState({
    nameFr: "",
    nameAr: "",
    addressFr: "",
    addressAr: "",
    cityFr: "",
    cityAr: "",
    isHome: false,
    capacity: "",
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Reset form
  const resetForm = () => {
    setFormData({
      nameFr: "",
      nameAr: "",
      addressFr: "",
      addressAr: "",
      cityFr: "",
      cityAr: "",
      isHome: false,
      capacity: "",
      imageUrl: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setUploadingImage(false);
    setFormMode(null);
    setEditingStadium(null);
    setError(null);
    setSuccess(null);
  };

  // Handle add button click
  const handleAddClick = () => {
    resetForm();
    setFormMode("add");
  };

  // Handle edit button click
  const handleEditClick = (stadium: StadiumData) => {
    setEditingStadium(stadium);
    setFormData({
      nameFr: stadium.nameFr,
      nameAr: stadium.nameAr || "",
      addressFr: stadium.addressFr || "",
      addressAr: stadium.addressAr || "",
      cityFr: stadium.cityFr || "",
      cityAr: stadium.cityAr || "",
      isHome: stadium.isHome,
      capacity: stadium.capacity?.toString() || "",
      imageUrl: stadium.imageUrl || "",
    });
    // Set image preview if image exists
    if (stadium.imageUrl) {
      setImagePreview(stadium.imageUrl);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
    setFormMode("edit");
    setError(null);
    setSuccess(null);
  };

  // Handle image file change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Type de fichier non autorisé. Seules les images sont acceptées (JPEG, PNG, GIF, WebP)");
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError("Le fichier est trop volumineux. Taille maximale : 5MB");
        return;
      }

      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image upload
  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) {
      return formData.imageUrl || null;
    }

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", imageFile);

      const response = await fetch("/api/upload/stadium", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erreur lors de l'upload");
      }

      return result.path;
    } catch (err) {
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload image if a new file was selected
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        imageUrl = (await handleImageUpload()) || formData.imageUrl;
      }

      const formDataObj = new FormData();
      formDataObj.append("nameFr", formData.nameFr);
      formDataObj.append("nameAr", formData.nameAr);
      formDataObj.append("addressFr", formData.addressFr);
      formDataObj.append("addressAr", formData.addressAr);
      formDataObj.append("cityFr", formData.cityFr);
      formDataObj.append("cityAr", formData.cityAr);
      formDataObj.append("isHome", formData.isHome ? "true" : "false");
      formDataObj.append("capacity", formData.capacity || "");
      formDataObj.append("imageUrl", imageUrl || "");

      let result;
      if (formMode === "add") {
        result = await createStadium(formDataObj);
      } else if (formMode === "edit" && editingStadium) {
        result = await updateStadium(editingStadium.id, formDataObj);
      } else {
        return;
      }

      if (result.success) {
        setSuccess(result.message || "Stade enregistré avec succès");
        resetForm();
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce stade ?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteStadium(id);
      if (result.success) {
        setSuccess(result.message || "Stade supprimé avec succès");
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
        <div className="col-12">
          <h1 className="mb-0">Gestion des Stades</h1>
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
            Ajouter un stade
          </button>
        </div>
      </div>

      {/* Add Form - Show before list when adding */}
      {formMode === "add" && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Ajouter un stade</h5>
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
                      <label htmlFor="nameFr-add" className="form-label">
                        Nom en français <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="nameFr-add"
                        required
                        maxLength={200}
                        value={formData.nameFr}
                        onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                        placeholder="Ex: Stade Municipal de Béja"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="nameAr-add" className="form-label">
                        Nom en arabe
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="nameAr-add"
                        maxLength={200}
                        value={formData.nameAr}
                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                        placeholder="Ex: الملعب البلدي باجة"
                        dir="rtl"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="addressFr-add" className="form-label">
                        Adresse (FR)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="addressFr-add"
                        maxLength={255}
                        value={formData.addressFr}
                        onChange={(e) => setFormData({ ...formData, addressFr: e.target.value })}
                        placeholder="Ex: Avenue Habib Bourguiba"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="addressAr-add" className="form-label">
                        Adresse (AR)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="addressAr-add"
                        maxLength={255}
                        value={formData.addressAr}
                        onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })}
                        placeholder="Ex: شارع الحبيب بورقيبة"
                        dir="rtl"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="cityFr-add" className="form-label">
                        Ville (FR)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="cityFr-add"
                        maxLength={100}
                        value={formData.cityFr}
                        onChange={(e) => setFormData({ ...formData, cityFr: e.target.value })}
                        placeholder="Ex: Béja"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label htmlFor="cityAr-add" className="form-label">
                        Ville (AR)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="cityAr-add"
                        maxLength={100}
                        value={formData.cityAr}
                        onChange={(e) => setFormData({ ...formData, cityAr: e.target.value })}
                        placeholder="Ex: باجة"
                        dir="rtl"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label htmlFor="capacity-add" className="form-label">
                        Capacité
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        id="capacity-add"
                        min="0"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        placeholder="Ex: 10000"
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-4 mb-3">
                      <div className="form-check mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isHome-add"
                          checked={formData.isHome}
                          onChange={(e) => setFormData({ ...formData, isHome: e.target.checked })}
                          disabled={loading}
                        />
                        <label className="form-check-label" htmlFor="isHome-add">
                          Stade domicile
                        </label>
                      </div>
                    </div>

                    <div className="col-md-12 mb-3">
                      <label htmlFor="imageFile-add" className="form-label">
                        Image du stade
                      </label>
                      {imagePreview && (
                        <div className="mb-2">
                          <img
                            src={imagePreview}
                            alt="Aperçu de l'image"
                            className="img-thumbnail skote-preview-img-300"
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                              setFormData({ ...formData, imageUrl: "" });
                            }}
                            disabled={loading || uploadingImage}
                          >
                            <i className="fas fa-times me-1" aria-hidden="true" />
                            Supprimer
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        className="form-control"
                        id="imageFile-add"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        disabled={loading || uploadingImage}
                      />
                      <div className="form-text">
                        Formats acceptés : JPEG, PNG, GIF, WebP. Taille maximale : 5MB
                      </div>
                      {uploadingImage && (
                        <div className="mt-2">
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          <small className="text-muted">Upload en cours...</small>
                        </div>
                      )}
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
            <div className="card-header">
              <h5 className="card-title mb-0">Liste des Stades</h5>
            </div>
            <div className="card-body">
              {stadiums.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucun stade enregistré</p>
                  <button type="button" className="btn btn-primary" onClick={handleAddClick}>
                    Ajouter le premier stade
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Nom (FR)</th>
                        <th>Nom (AR)</th>
                        <th>Ville</th>
                        <th>Capacité</th>
                        <th>Domicile</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stadiums.map((stadium) => (
                        <tr key={stadium.id}>
                          <td>{stadium.nameFr}</td>
                          <td>{stadium.nameAr || <span className="text-muted">-</span>}</td>
                          <td>
                            {stadium.cityFr || <span className="text-muted">-</span>}
                            {stadium.cityAr && (
                              <>
                                <br />
                                <small className="text-muted" dir="rtl">{stadium.cityAr}</small>
                              </>
                            )}
                          </td>
                          <td>{stadium.capacity ? stadium.capacity.toLocaleString() : <span className="text-muted">-</span>}</td>
                          <td>
                            {stadium.isHome ? (
                              <span className="badge bg-success">Oui</span>
                            ) : (
                              <span className="badge bg-secondary">Non</span>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditClick(stadium)}
                                disabled={loading || isPending}
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(stadium.id)}
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

        {/* Form Column - Right when editing */}
        {formMode === "edit" && (
          <div className="col-12 col-lg-5 mt-4 mt-lg-0">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Modifier le stade</h5>
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
                    <label htmlFor="nameFr" className="form-label">
                      Nom en français <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="nameFr"
                      required
                      maxLength={200}
                      value={formData.nameFr}
                      onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                      placeholder="Ex: Stade Municipal de Béja"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="nameAr" className="form-label">
                      Nom en arabe
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="nameAr"
                      maxLength={200}
                      value={formData.nameAr}
                      onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                      placeholder="Ex: الملعب البلدي باجة"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="addressFr" className="form-label">
                      Adresse (FR)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="addressFr"
                      maxLength={255}
                      value={formData.addressFr}
                      onChange={(e) => setFormData({ ...formData, addressFr: e.target.value })}
                      placeholder="Ex: Avenue Habib Bourguiba"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="addressAr" className="form-label">
                      Adresse (AR)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="addressAr"
                      maxLength={255}
                      value={formData.addressAr}
                      onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })}
                      placeholder="Ex: شارع الحبيب بورقيبة"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="cityFr" className="form-label">
                      Ville (FR)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="cityFr"
                      maxLength={100}
                      value={formData.cityFr}
                      onChange={(e) => setFormData({ ...formData, cityFr: e.target.value })}
                      placeholder="Ex: Béja"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="cityAr" className="form-label">
                      Ville (AR)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="cityAr"
                      maxLength={100}
                      value={formData.cityAr}
                      onChange={(e) => setFormData({ ...formData, cityAr: e.target.value })}
                      placeholder="Ex: باجة"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="capacity" className="form-label">
                      Capacité
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="capacity"
                      min="0"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="Ex: 10000"
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isHome"
                        checked={formData.isHome}
                        onChange={(e) => setFormData({ ...formData, isHome: e.target.checked })}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="isHome">
                        Stade domicile
                      </label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="imageFile" className="form-label">
                      Image du stade
                    </label>
                    {imagePreview && (
                      <div className="mb-2">
                        <img
                          src={imagePreview}
                          alt="Image actuelle"
                          className="img-thumbnail skote-preview-img-300"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      className="form-control"
                      id="imageFile"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      disabled={loading || uploadingImage}
                    />
                    <div className="form-text">
                      Formats acceptés : JPEG, PNG, GIF, WebP. Taille maximale : 5MB
                      {imagePreview && !imageFile && (
                        <span className="text-muted d-block mt-1">
                          L&apos;image actuelle sera conservée si aucun nouveau fichier n&apos;est sélectionné.
                        </span>
                      )}
                    </div>
                    {imagePreview && imageFile && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger mt-2"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(editingStadium?.imageUrl || null);
                        }}
                        disabled={loading || uploadingImage}
                      >
                        <i className="fas fa-times me-1" aria-hidden="true" />
                        Annuler la sélection
                      </button>
                    )}
                    {uploadingImage && (
                      <div className="mt-2">
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        <small className="text-muted">Upload en cours...</small>
                      </div>
                    )}
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

