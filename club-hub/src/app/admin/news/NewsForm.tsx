"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createNews, updateNews, addMediaToNews, removeMediaFromNews } from "./actions";
import { RichTextEditor } from "./RichTextEditor";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useConfirm } from "@/hooks/useConfirm";

/**
 * Plain object type for News (serializable)
 */
interface NewsData {
  id: number;
  title: string;
  contentHtml: string;
  coverImage: string | null;
  authorId: number | null;
  status: "DRAFT" | "PUBLISHED";
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface NewsMediaItem {
  id: number;
  mediaItemId: number;
  url: string;
  type: string;
  displayOrder: number;
}

interface AvailableMediaItem {
  id: number;
  url: string;
  type: string;
}

interface NewsFormProps {
  initialData?: NewsData | null;
  initialMedia?: NewsMediaItem[];
  availableMediaItems?: AvailableMediaItem[];
  mode: "create" | "edit";
}

/**
 * News Form Component
 * Handles creation and editing of news articles
 */
export function NewsForm({ initialData, initialMedia = [], availableMediaItems = [], mode }: NewsFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    contentHtml: initialData?.contentHtml || "",
    coverImage: initialData?.coverImage || "",
    status: (initialData?.status || "DRAFT") as "DRAFT" | "PUBLISHED",
    isPublished: initialData?.isPublished || false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [associatedMedia, setAssociatedMedia] = useState<NewsMediaItem[]>(initialMedia);
  const [availableMedia, setAvailableMedia] = useState<AvailableMediaItem[]>(availableMediaItems);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const prevNewsIdRef = useRef<number | undefined>(initialData?.id);
  
  // For create mode: store selected media IDs before news creation
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);

  // Fetch available media items on mount if not provided
  useEffect(() => {
    const fetchMediaItems = async () => {
      if (availableMediaItems.length === 0) {
        setLoadingMedia(true);
        try {
          const response = await fetch("/api/admin/media-items");
          if (response.ok) {
            const data = await response.json();
            setAvailableMedia(data);
          }
        } catch (error) {
          console.error("Error fetching media items:", error);
        } finally {
          setLoadingMedia(false);
        }
      } else if (availableMediaItems.length > 0) {
        setAvailableMedia(availableMediaItems);
      }
    };

    fetchMediaItems();
  }, [availableMediaItems]);

  // Update form data and media when initialData changes (for edit mode)
  // Only update if the news ID actually changed (new article loaded)
  useEffect(() => {
    if (initialData && initialData.id !== prevNewsIdRef.current) {
      prevNewsIdRef.current = initialData.id;
      
      setFormData({
        title: initialData.title,
        contentHtml: initialData.contentHtml,
        coverImage: initialData.coverImage || "",
        status: initialData.status,
        isPublished: initialData.isPublished,
      });
      
      // Set image preview if image exists
      if (initialData.coverImage) {
        setImagePreview(initialData.coverImage);
      } else {
        setImagePreview(null);
      }
      setImageFile(null);
      
      setAssociatedMedia(initialMedia);
    }
  }, [initialData, initialMedia]);

  // Handle add media to news (edit mode)
  const handleAddMedia = async (mediaItemId: number) => {
    if (mode === "edit") {
      if (!initialData?.id) return;

      setLoading(true);
      try {
        const result = await addMediaToNews(initialData.id, mediaItemId, associatedMedia.length);
        if (result.success) {
          setSuccess(result.message ?? null);
          startTransition(() => {
            router.refresh();
          });
        } else {
          setError(result.error || "Erreur lors de l'ajout du média");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    } else {
      // Create mode: add to selectedMediaIds
      if (!selectedMediaIds.includes(mediaItemId)) {
        setSelectedMediaIds([...selectedMediaIds, mediaItemId]);
      }
    }
  };

  // Handle remove media from news
  const handleRemoveMedia = async (mediaItemId: number) => {
    if (mode === "edit") {
      if (!initialData?.id) return;

      if (!(await confirm("Êtes-vous sûr de vouloir retirer ce média de l'actualité ?"))) {
        return;
      }

      setLoading(true);
      try {
        const result = await removeMediaFromNews(initialData.id, mediaItemId);
        if (result.success) {
          setSuccess(result.message ?? null);
          startTransition(() => {
            router.refresh();
          });
        } else {
          setError(result.error || "Erreur lors de la suppression du média");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    } else {
      // Create mode: remove from selectedMediaIds
      setSelectedMediaIds(selectedMediaIds.filter((id) => id !== mediaItemId));
    }
  };

  // Get media items not yet associated (edit mode) or not yet selected (create mode)
  const availableMediaToAdd = availableMedia.filter((media) => {
    if (mode === "edit") {
      return !associatedMedia.some((am) => am.mediaItemId === media.id);
    } else {
      return !selectedMediaIds.includes(media.id);
    }
  });

  // Get selected media for display in create mode
  const selectedMediaForDisplay = availableMedia.filter((media) => selectedMediaIds.includes(media.id));

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
      return formData.coverImage || null;
    }

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", imageFile);

      const response = await fetch("/api/upload/news", {
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
      let coverImage = formData.coverImage;
      if (imageFile) {
        coverImage = (await handleImageUpload()) || formData.coverImage;
      }

      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("contentHtml", formData.contentHtml);
      formDataObj.append("coverImage", coverImage || "");
      formDataObj.append("status", formData.status);
      formDataObj.append("isPublished", formData.isPublished.toString());
      if (formData.isPublished && formData.status === "PUBLISHED") {
        formDataObj.append("publishedAt", new Date().toISOString());
      }

      // Add selected media IDs for create mode
      if (mode === "create" && selectedMediaIds.length > 0) {
        formDataObj.append("mediaIds", JSON.stringify(selectedMediaIds));
      }

      let result;
      if (mode === "create") {
        result = await createNews(formDataObj);
      } else if (mode === "edit" && initialData) {
        result = await updateNews(initialData.id, formDataObj);
      } else {
        return;
      }

      if (result.success) {
        setSuccess(result.message ?? null);
        // If creating, redirect to edit page (media already associated)
        const createdNewsId = "id" in result && typeof result.id === "number" ? result.id : null;
        if (mode === "create" && createdNewsId) {
          setSelectedMediaIds([]); // Reset selected media
          setTimeout(() => {
            router.push(`/admin/news/${createdNewsId}/edit`);
          }, 1500);
        } else {
          // If editing, stay on page and refresh
          setTimeout(() => {
            startTransition(() => {
              router.refresh();
            });
          }, 1500);
        }
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
      {confirmDialog}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="mb-0">{mode === "create" ? "Créer une actualité" : "Modifier l'actualité"}</h1>
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
        <div className="col-12 col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                {mode === "create" ? "Nouvelle actualité" : "Modifier l'actualité"}
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="title" className="form-label">
                    Titre <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="title"
                    required
                    maxLength={200}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titre de l'actualité"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="contentHtml" className="form-label">
                    Contenu <span className="text-danger">*</span>
                  </label>
                  <RichTextEditor
                    value={formData.contentHtml}
                    onChange={(value) => setFormData({ ...formData, contentHtml: value })}
                    placeholder="Rédigez votre contenu ici..."
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="imageFile" className="form-label">
                    Image de couverture
                  </label>
                  {imagePreview && (
                    <div className="mb-2">
                      <ImageWithFallback
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
                          setFormData({ ...formData, coverImage: "" });
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
                    id="imageFile"
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

                {/* Media Management Section - Available in both create and edit modes */}
                <div className="mb-4">
                  <label className="form-label fw-bold">Médias associés</label>
                  <div className="card">
                    <div className="card-body">
                      {/* Associated Media List */}
                      {(mode === "edit" ? associatedMedia.length > 0 : selectedMediaIds.length > 0) ? (
                        <div className="row g-3 mb-3">
                          {mode === "edit"
                            ? associatedMedia.map((media, index) => (
                                <div key={`${media.mediaItemId}-${index}`} className="col-md-4">
                                  <div className="card">
                                    <div className="card-body p-2">
                                      <MediaPreview
                                        url={media.url}
                                        type={media.type as "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO"}
                                        className="mb-2"
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger w-100"
                                        onClick={() => handleRemoveMedia(media.mediaItemId)}
                                        disabled={loading}
                                      >
                                        <i className="fas fa-times me-1" aria-hidden="true" />
                                        Retirer
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            : selectedMediaForDisplay.map((media, index) => (
                                <div key={`${media.id}-${index}`} className="col-md-4">
                                  <div className="card">
                                    <div className="card-body p-2">
                                      <MediaPreview
                                        url={media.url}
                                        type={media.type as "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO"}
                                        className="mb-2"
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger w-100"
                                        onClick={() => handleRemoveMedia(media.id)}
                                        disabled={loading}
                                      >
                                        <i className="fas fa-times me-1" aria-hidden="true" />
                                        Retirer
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                        </div>
                      ) : (
                        <p className="text-muted mb-3">Aucun média associé</p>
                      )}

                      {/* Add Media */}
                      {loadingMedia ? (
                        <div className="text-center">
                          <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Chargement...</span>
                          </div>
                        </div>
                      ) : availableMediaToAdd.length > 0 ? (
                        <div>
                          <label className="form-label">Ajouter un média</label>
                          <select
                            className="form-select"
                            onChange={(e) => {
                              const mediaId = parseInt(e.target.value, 10);
                              if (mediaId) {
                                handleAddMedia(mediaId);
                                e.target.value = "";
                              }
                            }}
                            disabled={loading}
                          >
                            <option value="">Sélectionner un média à ajouter</option>
                            {availableMediaToAdd.map((media) => (
                              <option key={media.id} value={media.id}>
                                {media.url} ({media.type})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-muted">
                          {mode === "edit"
                            ? "Tous les médias disponibles sont déjà associés"
                            : "Tous les médias disponibles sont déjà sélectionnés"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="status" className="form-label">
                      Statut
                    </label>
                    <select
                      className="form-select"
                      id="status"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as "DRAFT" | "PUBLISHED" })
                      }
                      disabled={loading}
                    >
                      <option value="DRAFT">Brouillon</option>
                      <option value="PUBLISHED">Publié</option>
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label d-block">&nbsp;</label>
                    <div className="form-check form-switch mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isPublished"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="isPublished">
                        Publié
                      </label>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={loading || uploadingImage}>
                    {loading || uploadingImage ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        {uploadingImage ? "Upload en cours..." : mode === "create" ? "Création..." : "Enregistrement..."}
                      </>
                    ) : (
                      <>
                        <i className={`fas ${mode === "create" ? "fa-save" : "fa-check"} me-2`} aria-hidden="true" />
                        {mode === "create" ? "Créer" : "Enregistrer"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push("/admin/news")}
                    disabled={loading || uploadingImage}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

