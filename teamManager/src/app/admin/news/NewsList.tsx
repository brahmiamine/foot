"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteNews } from "./actions";

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

interface NewsListProps {
  initialNews: NewsData[];
}

/**
 * News List Component
 * Displays the list of news articles with actions
 */
export function NewsList({ initialNews }: NewsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [news] = useState<NewsData[]>(initialNews);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette actualité ?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await deleteNews(id);
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
          <h1 className="mb-0">Gestion des Actualités</h1>
          <Link href="/admin/news/create" className="btn btn-primary">
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Ajouter une actualité
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
              <h5 className="card-title mb-0">Liste des Actualités</h5>
            </div>
            <div className="card-body">
              {news.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">Aucune actualité enregistrée</p>
                  <Link href="/admin/news/create" className="btn btn-primary">
                    Ajouter la première actualité
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Titre</th>
                        <th>Statut</th>
                        <th>Date de création</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {news.map((newsItem) => (
                        <tr key={newsItem.id}>
                          <td>
                            <strong>{newsItem.title}</strong>
                            {newsItem.coverImage && (
                              <span className="badge bg-secondary ms-2">
                                <i className="fas fa-image" aria-hidden="true" />
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                newsItem.status === "PUBLISHED" && newsItem.isPublished
                                  ? "bg-success"
                                  : "bg-warning"
                              }`}
                            >
                              {newsItem.status === "PUBLISHED" && newsItem.isPublished
                                ? "Publié"
                                : "Brouillon"}
                            </span>
                          </td>
                          <td>{new Date(newsItem.createdAt).toLocaleDateString("fr-FR")}</td>
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <Link
                                href={`/admin/news/${newsItem.id}/edit`}
                                className="btn btn-sm btn-outline-primary"
                              >
                                <i className="fas fa-edit" aria-hidden="true" />
                                <span className="visually-hidden">Modifier</span>
                              </Link>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(newsItem.id)}
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

