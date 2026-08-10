"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { createPlayer, updatePlayer } from "./actions";

type PlayerStatus = "TITULAR" | "SUBSTITUTE" | "BLANK" | "ENTERING" | "OUT_OF_LIST" | "SUSPENDED";

const statusLabels: Record<PlayerStatus, string> = {
  TITULAR: "Titulaire",
  SUBSTITUTE: "Remplaçant",
  BLANK: "Blanc",
  ENTERING: "Rentrant",
  OUT_OF_LIST: "Hors liste",
  SUSPENDED: "Suspendu",
};
// SUSPENDED n'est jamais choisi manuellement : positionné par cardManager.
const selectableStatuses: PlayerStatus[] = ["TITULAR", "SUBSTITUTE", "BLANK", "ENTERING", "OUT_OF_LIST"];

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

interface PlayerFormProps {
  initialData?: PlayerData | null;
  mode: "create" | "edit";
  allowedCategories: readonly AgeCategory[];
}

/**
 * Player Form Component
 * Handles creation and editing of players (fiche disciplinaire cardManager +
 * fiche site public teamManager, même ligne).
 */
export function PlayerForm({ initialData, mode, allowedCategories }: PlayerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    firstNameFr: initialData?.firstNameFr || "",
    lastNameFr: initialData?.lastNameFr || "",
    firstNameAr: initialData?.firstNameAr || "",
    lastNameAr: initialData?.lastNameAr || "",
    number: initialData?.number?.toString() ?? "",
    status: initialData?.status ?? "TITULAR",
    birthDate: formatDateForInput(initialData?.birthDate),
    position: initialData?.position || "",
    imageUrl: initialData?.imageUrl || "",
    category: initialData?.category || allowedCategories[0] || "seniors",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        firstNameFr: initialData.firstNameFr,
        lastNameFr: initialData.lastNameFr,
        firstNameAr: initialData.firstNameAr || "",
        lastNameAr: initialData.lastNameAr || "",
        number: initialData.number?.toString() ?? "",
        status: initialData.status ?? "TITULAR",
        birthDate: formatDateForInput(initialData.birthDate),
        position: initialData.position || "",
        imageUrl: initialData.imageUrl || "",
        category: initialData.category || allowedCategories[0] || "seniors",
      });
      // Set image preview if image exists
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      } else {
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [initialData]);

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
  const handleImageUpload = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload/players", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'upload de l'image");
      }

      const data = await response.json();
      return data.path;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload de l'image");
      return null;
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
      // Upload image if a new file is selected
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        const uploadedPath = await handleImageUpload(imageFile);
        if (uploadedPath) {
          imageUrl = uploadedPath;
        } else {
          setLoading(false);
          return;
        }
      }

      const formDataObj = new FormData();
      formDataObj.append("firstNameFr", formData.firstNameFr);
      formDataObj.append("lastNameFr", formData.lastNameFr);
      formDataObj.append("firstNameAr", formData.firstNameAr);
      formDataObj.append("lastNameAr", formData.lastNameAr);
      formDataObj.append("number", formData.number);
      formDataObj.append("status", formData.status);
      formDataObj.append("birthDate", formData.birthDate);
      formDataObj.append("position", formData.position);
      formDataObj.append("imageUrl", imageUrl || "");
      formDataObj.append("category", formData.category);

      let result;
      if (mode === "create") {
        result = await createPlayer(formDataObj);
      } else if (mode === "edit" && initialData) {
        result = await updatePlayer(initialData.id, formDataObj);
      } else {
        return;
      }

      if (result.success) {
        setSuccess(result.message ?? null);
        // Redirect to list after a short delay
        setTimeout(() => {
          router.push("/admin/players");
        }, 1000);
      } else {
        setError(result.error || "Une erreur est survenue");
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
          <h1 className="mb-0">{mode === "create" ? "Ajouter un joueur" : "Modifier un joueur"}</h1>
          <Link href="/admin/players" className="btn btn-secondary">
            <i className="fas fa-arrow-left me-2" aria-hidden="true" />
            Retour à la liste
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
              <h5 className="card-title mb-0">{mode === "create" ? "Nouveau joueur" : "Modifier le joueur"}</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="firstNameFr" className="form-label">
                      Prénom (FR) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="firstNameFr"
                      required
                      maxLength={191}
                      value={formData.firstNameFr}
                      onChange={(e) => setFormData({ ...formData, firstNameFr: e.target.value })}
                      placeholder="Prénom"
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="lastNameFr" className="form-label">
                      Nom (FR) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="lastNameFr"
                      required
                      maxLength={191}
                      value={formData.lastNameFr}
                      onChange={(e) => setFormData({ ...formData, lastNameFr: e.target.value })}
                      placeholder="Nom"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="firstNameAr" className="form-label">
                      Prénom (AR)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="firstNameAr"
                      maxLength={191}
                      value={formData.firstNameAr}
                      onChange={(e) => setFormData({ ...formData, firstNameAr: e.target.value })}
                      placeholder="الاسم الأول"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="lastNameAr" className="form-label">
                      Nom (AR)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="lastNameAr"
                      maxLength={191}
                      value={formData.lastNameAr}
                      onChange={(e) => setFormData({ ...formData, lastNameAr: e.target.value })}
                      placeholder="اسم العائلة"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-3 mb-3">
                    <label htmlFor="number" className="form-label">
                      Numéro de maillot <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="number"
                      required
                      min="0"
                      max="99"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="0 = sans numéro"
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-3 mb-3">
                    <label htmlFor="status" className="form-label">
                      Statut
                    </label>
                    <select
                      className="form-select"
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as PlayerStatus })}
                      disabled={loading}
                    >
                      {selectableStatuses.map((s) => (
                        <option key={s} value={s}>
                          {statusLabels[s]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3 mb-3">
                    <label htmlFor="birthDate" className="form-label">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      id="birthDate"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-3 mb-3">
                    <label htmlFor="position" className="form-label">
                      Position
                    </label>
                    <select
                      className="form-select"
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      disabled={loading}
                    >
                      <option value="">Sélectionner une position</option>
                      <option value="GOALKEEPER">Gardien</option>
                      <option value="DEFENDER">Défenseur</option>
                      <option value="MIDFIELDER">Milieu</option>
                      <option value="FORWARD">Attaquant</option>
                    </select>
                  </div>

                  <div className="col-md-3 mb-3">
                    <label htmlFor="category" className="form-label">
                      Catégorie <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="category"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as AgeCategory })}
                      disabled={loading || allowedCategories.length <= 1}
                    >
                      {allowedCategories.map((c) => (
                        <option key={c} value={c}>
                          {AGE_CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12 mb-3">
                    <label htmlFor="image" className="form-label">
                      Photo du joueur
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      id="image"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      disabled={loading || uploadingImage}
                    />
                    <div className="form-text">Formats acceptés : JPEG, PNG, GIF, WebP (max 5MB)</div>
                    {imagePreview && (
                      <div className="mt-2">
                        <ImageWithFallback
                          src={imagePreview}
                          alt="Aperçu"
                          className="img-thumbnail skote-preview-img-200"
                        />
                      </div>
                    )}
                    {uploadingImage && (
                      <div className="mt-2">
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        <small className="text-muted">Upload en cours...</small>
                      </div>
                    )}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={loading || uploadingImage}>
                    {loading || uploadingImage ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        {uploadingImage ? "Upload..." : mode === "create" ? "Création..." : "Enregistrement..."}
                      </>
                    ) : (
                      <>
                        <i className={`fas ${mode === "create" ? "fa-save" : "fa-check"} me-2`} aria-hidden="true" />
                        {mode === "create" ? "Créer" : "Enregistrer"}
                      </>
                    )}
                  </button>
                  <Link href="/admin/players" className="btn btn-secondary" onClick={(e) => loading && e.preventDefault()}>
                    Annuler
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
