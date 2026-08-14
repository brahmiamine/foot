"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { RichTextEditor } from "../news/RichTextEditor";
import { createAnnouncement, updateAnnouncement, togglePublish, deleteAnnouncement } from "./actions";

interface AnnouncementData {
  id: number;
  title: string;
  contentHtml: string;
  category: "DECISION" | "PROGRAMME" | "ADMINISTRATIF" | "RECRUTEMENT" | "SANCTION" | "ANNONCE";
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<AnnouncementData["category"], string> = {
  DECISION: "Décision du club",
  PROGRAMME: "Changement de programme",
  ADMINISTRATIF: "Information administrative",
  RECRUTEMENT: "Recrutement",
  SANCTION: "Sanction interne publique",
  ANNONCE: "Annonce officielle",
};

type FormMode = "add" | "edit" | null;

export function AnnouncementsManagement({ initialAnnouncements }: { initialAnnouncements: AnnouncementData[] }) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<AnnouncementData | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  function openAdd() {
    setEditing(null);
    setContent("");
    setFormMode(formMode === "add" ? null : "add");
  }

  function openEdit(announcement: AnnouncementData) {
    setEditing(announcement);
    setContent(announcement.contentHtml);
    setFormMode("edit");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("contentHtml", content);

    try {
      const result = editing ? await updateAnnouncement(editing.id, formData) : await createAnnouncement(formData);
      if (result.success) {
        setFormMode(null);
        setEditing(null);
        router.refresh();
      } else {
        setError(result.error || "Erreur");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePublish(announcement: AnnouncementData) {
    await togglePublish(announcement.id, !announcement.isPublished);
    router.refresh();
  }

  async function handleDelete(announcement: AnnouncementData) {
    const ok = await confirm(`Supprimer le communiqué "${announcement.title}" ?`, { variant: "danger" });
    if (!ok) return;
    await deleteAnnouncement(announcement.id);
    router.refresh();
  }

  return (
    <div>
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0">Décisions, programme, administratif, recrutement, sanctions publiques, annonces.</p>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          {formMode === "add" ? "Annuler" : "+ Nouveau communiqué"}
        </button>
      </div>

      {formMode && (
        <form onSubmit={handleSubmit} className="card mb-4">
          <div className="card-body row g-3">
            {error && (
              <div className="col-12">
                <div className="alert alert-danger mb-0">{error}</div>
              </div>
            )}
            <div className="col-12 col-md-8">
              <label className="form-label">Titre *</label>
              <input name="title" className="form-control" required defaultValue={editing?.title ?? ""} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Catégorie *</label>
              <select name="category" className="form-select" required defaultValue={editing?.category ?? "ANNONCE"}>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Contenu *</label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Enregistrement..." : editing ? "Modifier" : "Publier le brouillon"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Catégorie</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {initialAnnouncements.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  Aucun communiqué.
                </td>
              </tr>
            )}
            {initialAnnouncements.map((announcement) => (
              <tr key={announcement.id}>
                <td>{announcement.title}</td>
                <td>{CATEGORY_LABELS[announcement.category]}</td>
                <td>
                  <span className={`badge ${announcement.isPublished ? "bg-success" : "bg-secondary"}`}>
                    {announcement.isPublished ? "Publié" : "Brouillon"}
                  </span>
                </td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => handleTogglePublish(announcement)}>
                    {announcement.isPublished ? "Dépublier" : "Publier"}
                  </button>
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openEdit(announcement)}>
                    Modifier
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(announcement)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
