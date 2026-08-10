"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useConfirm } from "@/hooks/useConfirm";
import { createProduct, updateProduct, deleteProduct } from "./actions";

/**
 * Plain object type for Product (serializable)
 */
interface ProductData {
  id: number;
  categoryId: number | null;
  categoryNameFr: string | null;
  nameFr: string;
  nameAr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface CategoryOption {
  id: number;
  nameFr: string;
  nameAr: string | null;
}

interface ProductsManagementProps {
  initialProducts: ProductData[];
  categories: CategoryOption[];
}

type FormMode = "add" | "edit" | null;

const emptyFormData = {
  categoryId: "",
  nameFr: "",
  nameAr: "",
  descriptionFr: "",
  descriptionAr: "",
  price: "",
  stock: "0",
  imageUrl: "",
  isActive: true,
};

/** Renvoie la classe de badge de stock selon le seuil (0 = rupture, < 5 = faible). */
function stockBadgeClass(stock: number): string {
  if (stock === 0) return "bg-danger-subtle text-danger";
  if (stock < 5) return "bg-warning-subtle text-warning";
  return "bg-success-subtle text-success";
}

/**
 * Products Management Component
 * Catalogue boutique du club : catégories, stock, prix, image.
 * Pas de commande/paiement en V1 — gestion pure du catalogue.
 */
export function ProductsManagement({ initialProducts, categories }: ProductsManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState<ProductData[]>(initialProducts);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { confirm, confirmDialog } = useConfirm();

  // Sync local state with props when they change (after refresh)
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const [formData, setFormData] = useState(emptyFormData);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.nameFr.toLowerCase().includes(term) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(term)) ||
        (p.categoryNameFr && p.categoryNameFr.toLowerCase().includes(term))
    );
  }, [products, search]);

  // Reset form
  const resetForm = () => {
    setFormData(emptyFormData);
    setImageFile(null);
    setImagePreview(null);
    setUploadingImage(false);
    setFormMode(null);
    setEditingProduct(null);
    setError(null);
    setSuccess(null);
  };

  // Handle add button click
  const handleAddClick = () => {
    resetForm();
    setFormMode("add");
  };

  // Handle edit button click
  const handleEditClick = (product: ProductData) => {
    setEditingProduct(product);
    setFormData({
      categoryId: product.categoryId ? String(product.categoryId) : "",
      nameFr: product.nameFr,
      nameAr: product.nameAr || "",
      descriptionFr: product.descriptionFr || "",
      descriptionAr: product.descriptionAr || "",
      price: String(product.price),
      stock: String(product.stock),
      imageUrl: product.imageUrl || "",
      isActive: product.isActive,
    });
    setImagePreview(product.imageUrl || null);
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

      const response = await fetch("/api/upload/product", {
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
      formDataObj.append("categoryId", formData.categoryId || "");
      formDataObj.append("nameFr", formData.nameFr);
      formDataObj.append("nameAr", formData.nameAr);
      formDataObj.append("descriptionFr", formData.descriptionFr);
      formDataObj.append("descriptionAr", formData.descriptionAr);
      formDataObj.append("price", formData.price || "0");
      formDataObj.append("stock", formData.stock || "0");
      formDataObj.append("imageUrl", imageUrl || "");
      formDataObj.append("isActive", formData.isActive ? "true" : "false");

      let result;
      if (formMode === "add") {
        result = await createProduct(formDataObj);
      } else if (formMode === "edit" && editingProduct) {
        result = await updateProduct(editingProduct.id, formDataObj);
      } else {
        return;
      }

      if (result.success) {
        setSuccess(result.message || "Produit enregistré avec succès");
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
    if (!(await confirm("Êtes-vous sûr de vouloir supprimer ce produit ?"))) {
      return;
    }

    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteProduct(id);
      if (result.success) {
        setSuccess(result.message || "Produit supprimé avec succès");
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  const renderFormFields = (idSuffix: string) => (
    <div className="row g-3">
      <div className="col-md-6">
        <label htmlFor={`nameFr-${idSuffix}`} className="form-label">
          Nom en français <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          id={`nameFr-${idSuffix}`}
          required
          maxLength={200}
          value={formData.nameFr}
          onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
          placeholder="Ex: Maillot domicile 2026"
          disabled={loading}
        />
      </div>

      <div className="col-md-6">
        <label htmlFor={`nameAr-${idSuffix}`} className="form-label">
          Nom en arabe
        </label>
        <input
          type="text"
          className="form-control"
          id={`nameAr-${idSuffix}`}
          maxLength={200}
          value={formData.nameAr}
          onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
          placeholder="Ex: قميص الديار 2026"
          dir="rtl"
          disabled={loading}
        />
      </div>

      <div className="col-md-6">
        <label htmlFor={`categoryId-${idSuffix}`} className="form-label">
          Catégorie
        </label>
        <select
          className="form-select"
          id={`categoryId-${idSuffix}`}
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          disabled={loading}
        >
          <option value="">Aucune catégorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameFr}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-3">
        <label htmlFor={`price-${idSuffix}`} className="form-label">
          Prix (DT) <span className="text-danger">*</span>
        </label>
        <input
          type="number"
          className="form-control"
          id={`price-${idSuffix}`}
          required
          min="0"
          step="0.001"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="Ex: 45.000"
          disabled={loading}
        />
      </div>

      <div className="col-md-3">
        <label htmlFor={`stock-${idSuffix}`} className="form-label">
          Stock
        </label>
        <input
          type="number"
          className="form-control"
          id={`stock-${idSuffix}`}
          min="0"
          step="1"
          value={formData.stock}
          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
          placeholder="Ex: 20"
          disabled={loading}
        />
      </div>

      <div className="col-md-6">
        <label htmlFor={`descriptionFr-${idSuffix}`} className="form-label">
          Description (FR)
        </label>
        <textarea
          className="form-control"
          id={`descriptionFr-${idSuffix}`}
          rows={3}
          value={formData.descriptionFr}
          onChange={(e) => setFormData({ ...formData, descriptionFr: e.target.value })}
          placeholder="Description du produit"
          disabled={loading}
        />
      </div>

      <div className="col-md-6">
        <label htmlFor={`descriptionAr-${idSuffix}`} className="form-label">
          Description (AR)
        </label>
        <textarea
          className="form-control"
          id={`descriptionAr-${idSuffix}`}
          rows={3}
          value={formData.descriptionAr}
          onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
          placeholder="وصف المنتج"
          dir="rtl"
          disabled={loading}
        />
      </div>

      <div className="col-md-12">
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id={`isActive-${idSuffix}`}
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor={`isActive-${idSuffix}`}>
            Produit actif (visible dans la boutique)
          </label>
        </div>
      </div>

      <div className="col-md-12">
        <label htmlFor={`imageFile-${idSuffix}`} className="form-label">
          Image du produit
        </label>
        {imagePreview && (
          <div className="mb-2">
            <ImageWithFallback src={imagePreview} alt="Aperçu de l'image" className="img-thumbnail skote-preview-img-300" />
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
          id={`imageFile-${idSuffix}`}
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleImageChange}
          disabled={loading || uploadingImage}
        />
        <div className="form-text">
          Formats acceptés : JPEG, PNG, GIF, WebP. Taille maximale : 5MB
          {imagePreview && !imageFile && formMode === "edit" && (
            <span className="text-muted d-block mt-1">
              L&apos;image actuelle sera conservée si aucun nouveau fichier n&apos;est sélectionné.
            </span>
          )}
        </div>
        {uploadingImage && (
          <div className="mt-2">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            <small className="text-muted">Upload en cours...</small>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Produits boutique</h1>
          <p className="text-muted mb-0">Gérez le catalogue de la boutique du club : stock, prix et images.</p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/shop/categories" className="btn btn-outline-secondary">
            <i className="fas fa-tags me-2" aria-hidden="true" />
            Gérer les catégories
          </Link>
          <button type="button" className="btn btn-primary" onClick={handleAddClick} disabled={loading || isPending}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Ajouter un produit
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-circle me-2" aria-hidden="true" />
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Fermer" />
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2" aria-hidden="true" />
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)} aria-label="Fermer" />
        </div>
      )}

      {/* Add Form */}
      {formMode === "add" && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border border-success">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-success">Ajouter un produit</h5>
                <button type="button" className="btn-close" onClick={resetForm} aria-label="Fermer" />
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {renderFormFields("add")}
                  <div className="d-flex gap-2 mt-3">
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
                    <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
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
            <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <h5 className="card-title mb-0">Liste des produits</h5>
              <div style={{ minWidth: "240px" }}>
                <input
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Rechercher un produit..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="card-body">
              {products.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucun produit enregistré</p>
                  <button type="button" className="btn btn-primary" onClick={handleAddClick}>
                    Ajouter le premier produit
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-0">Aucun produit ne correspond à la recherche</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Image</th>
                        <th>Nom</th>
                        <th>Catégorie</th>
                        <th>Prix</th>
                        <th>Stock</th>
                        <th>Statut</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            {product.imageUrl ? (
                              <ImageWithFallback
                                src={product.imageUrl}
                                alt={product.nameFr}
                                className="avatar-sm rounded"
                                style={{ objectFit: "cover" }}
                                fallbackIcon="fas fa-image text-muted"
                              />
                            ) : (
                              <div className="avatar-sm rounded bg-light d-flex align-items-center justify-content-center">
                                <i className="fas fa-image text-muted" aria-hidden="true" />
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="fw-medium">{product.nameFr}</div>
                            {product.nameAr && (
                              <small className="text-muted" dir="rtl">
                                {product.nameAr}
                              </small>
                            )}
                          </td>
                          <td>
                            {product.categoryNameFr ? (
                              <span className="badge bg-info-subtle text-info">{product.categoryNameFr}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>{product.price.toFixed(3)} DT</td>
                          <td>
                            <span className={`badge ${stockBadgeClass(product.stock)}`}>{product.stock}</span>
                          </td>
                          <td>
                            {product.isActive ? (
                              <span className="badge bg-success-subtle text-success">Actif</span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary">Inactif</span>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditClick(product)}
                                disabled={loading || isPending}
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(product.id)}
                                disabled={deletingId === product.id || isPending}
                              >
                                {deletingId === product.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                ) : (
                                  <i className="fas fa-trash" aria-hidden="true" />
                                )}
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
            <div className="card border border-primary">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-primary">Modifier le produit</h5>
                <button type="button" className="btn-close" onClick={resetForm} aria-label="Fermer" />
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {renderFormFields("edit")}
                  <div className="d-flex gap-2 mt-3">
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
                    <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
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
