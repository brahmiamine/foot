"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createStaff, updateStaff } from "./actions";

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

interface StaffFormProps {
  initialData?: StaffData | null;
  mode: "create" | "edit";
}

/**
 * Staff Form Component
 * Handles creation and editing of staff members
 */
export function StaffForm({ initialData, mode }: StaffFormProps) {
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
    birthDate: formatDateForInput(initialData?.birthDate),
    phone: initialData?.phone || "",
    imageUrl: initialData?.imageUrl || "",
    staffType: initialData?.staffType || "COACH",
    userId: initialData?.userId?.toString() || "",
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
        birthDate: formatDateForInput(initialData.birthDate),
        phone: initialData.phone || "",
        imageUrl: initialData.imageUrl || "",
        staffType: initialData.staffType || "COACH",
        userId: initialData.userId?.toString() || "",
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

      const response = await fetch("/api/upload/staff", {
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
      formDataObj.append("birthDate", formData.birthDate);
      formDataObj.append("phone", formData.phone);
      formDataObj.append("imageUrl", imageUrl || "");
      formDataObj.append("staffType", formData.staffType);
      formDataObj.append("userId", formData.userId);

      let result;
      if (mode === "create") {
        result = await createStaff(formDataObj);
      } else if (mode === "edit" && initialData) {
        result = await updateStaff(initialData.id, formDataObj);
      } else {
        return;
      }

      if (result.success) {
        setSuccess(result.message ?? null);
        // Redirect to list after a short delay
        setTimeout(() => {
          router.push("/admin/staff");
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
          <h1 className="mb-0">{mode === "create" ? "Ajouter un membre du staff" : "Modifier un membre du staff"}</h1>
          <Link href="/admin/staff" className="btn btn-secondary">
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
              <h5 className="card-title mb-0">{mode === "create" ? "Nouveau membre du staff" : "Modifier le membre du staff"}</h5>
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
                      maxLength={100}
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
                      maxLength={100}
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
                      maxLength={100}
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
                      maxLength={100}
                      value={formData.lastNameAr}
                      onChange={(e) => setFormData({ ...formData, lastNameAr: e.target.value })}
                      placeholder="اسم العائلة"
                      dir="rtl"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label htmlFor="birthDate" className="form-label">
                      Date de naissance <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      id="birthDate"
                      required
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label htmlFor="phone" className="form-label">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      id="phone"
                      maxLength={30}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+216 XX XXX XXX"
                      disabled={loading}
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label htmlFor="staffType" className="form-label">
                      Type de staff <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="staffType"
                      required
                      value={formData.staffType}
                      onChange={(e) => setFormData({ ...formData, staffType: e.target.value })}
                      disabled={loading}
                    >
                      <option value="COACH">Entraîneur</option>
                      <option value="ADJOINT">Adjoint</option>
                      <option value="KINE">Kinésithérapeute</option>
                      <option value="MEDECIN">Médecin</option>
                      <option value="PREPARATEUR">Préparateur physique</option>
                      <option value="ANALYSTE">Analyste</option>
                      <option value="EQUIPEMENTIER">Équipementier</option>
                      <option value="COMMUNICATION">Communication</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12 mb-3">
                    <label htmlFor="image" className="form-label">
                      Photo
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
                        <img
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

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="userId" className="form-label">
                      ID Utilisateur (optionnel)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="userId"
                      min="1"
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      placeholder="ID du compte utilisateur"
                      disabled={loading}
                    />
                    <div className="form-text">Lier ce membre du staff à un compte utilisateur</div>
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
                  <Link href="/admin/staff" className="btn btn-secondary" onClick={(e) => loading && e.preventDefault()}>
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

