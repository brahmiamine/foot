"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import type { BoardElement } from "@/types/tactics";
import { createTacticsBoard, updateTacticsBoard, duplicateTacticsBoard } from "./actions";

type ToolType = BoardElement["type"];

const PALETTE: { type: ToolType; label: string; icon: string }[] = [
  { type: "BALL", label: "Ballon", icon: "⚽" },
  { type: "GOAL", label: "Cage", icon: "🥅" },
  { type: "MINI_GOAL", label: "Petite cage", icon: "🚪" },
  { type: "RING", label: "Anneau", icon: "⭕" },
  { type: "DOME_CONE", label: "Plot", icon: "🔶" },
  { type: "CONE", label: "Cône", icon: "🚧" },
  { type: "PLAYER", label: "Joueur", icon: "🧍" },
  { type: "FLAG", label: "Drapeau", icon: "🚩" },
  { type: "LADDER", label: "Échelle", icon: "🪜" },
  { type: "HURDLE", label: "Haie", icon: "🟥" },
  { type: "POLE", label: "Piquet", icon: "📍" },
  { type: "BIB", label: "Chasuble", icon: "🎽" },
  { type: "TEXT", label: "Texte", icon: "🔤" },
  { type: "ARROW", label: "Flèche", icon: "➡️" },
  { type: "LINE", label: "Trait", icon: "➖" },
];

const PLAYER_COLORS = [
  { value: "#c42221", label: "Rouge" },
  { value: "#0d6efd", label: "Bleu" },
  { value: "#ffc107", label: "Jaune" },
  { value: "#198754", label: "Vert" },
  { value: "#031521", label: "Noir" },
];

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `el-${Date.now()}-${idCounter}`;
}

export function TacticsBoardEditor({
  boardId,
  initialTitle,
  initialDescription,
  initialCategory,
  initialIsPublic,
  initialElements,
  allowedCategories,
  readOnly,
}: {
  boardId?: number;
  initialTitle: string;
  initialDescription: string | null;
  initialCategory: AgeCategory | null;
  initialIsPublic: boolean;
  initialElements: BoardElement[];
  allowedCategories: readonly AgeCategory[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [category, setCategory] = useState<string>(initialCategory ?? "");
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [elements, setElements] = useState<BoardElement[]>(initialElements);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pitchRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; handle: "point" | "end" } | null>(null);

  const selected = useMemo(() => elements.find((e) => e.id === selectedId) ?? null, [elements, selectedId]);

  const clampPercent = (value: number) => Math.max(1, Math.min(99, value));

  const pointFromEvent = (e: { clientX: number; clientY: number }) => {
    const rect = pitchRef.current!.getBoundingClientRect();
    return {
      x: clampPercent(((e.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((e.clientY - rect.top) / rect.height) * 100),
    };
  };

  const handlePitchClick = (e: React.MouseEvent) => {
    if (readOnly || !activeTool) return;
    const { x, y } = pointFromEvent(e);
    const id = newId();
    const base: BoardElement = { id, type: activeTool, x, y, color: null, number: null, text: null, endPoint: null };

    if (activeTool === "PLAYER") {
      base.color = PLAYER_COLORS[0].value;
      base.number = 1;
    } else if (activeTool === "TEXT") {
      base.text = "Texte";
    } else if (activeTool === "ARROW" || activeTool === "LINE") {
      base.endPoint = { x: clampPercent(x + 12), y: clampPercent(y - 12) };
    }

    setElements((prev) => [...prev, base]);
    setSelectedId(id);
    setActiveTool(null);
  };

  const handleTokenPointerDown = (id: string, handle: "point" | "end") => (e: React.PointerEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, handle };
    setSelectedId(id);
  };

  const handlePitchPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !pitchRef.current) return;
    const { x, y } = pointFromEvent(e);
    const { id, handle } = dragRef.current;
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        if (handle === "end") return { ...el, endPoint: { x, y } };
        return { ...el, x, y };
      })
    );
  };

  const handlePitchPointerUp = () => {
    dragRef.current = null;
  };

  const updateSelected = (patch: Partial<BoardElement>) => {
    if (!selectedId) return;
    setElements((prev) => prev.map((el) => (el.id === selectedId ? { ...el, ...patch } : el)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const clearBoard = () => {
    setElements([]);
    setSelectedId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        title,
        description: description || null,
        category: category || null,
        isPublic,
        contentJson: JSON.stringify({ elements }),
      };
      const result = boardId ? await updateTacticsBoard(boardId, payload) : await createTacticsBoard(payload);
      if (result.success) {
        setSuccess(result.message ?? null);
        if (!boardId && "id" in result && result.id) {
          router.push(`/admin/tactics/${result.id}`);
        }
      } else {
        setError(result.error || "Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!boardId) return;
    await duplicateTacticsBoard(boardId);
  };

  const handleExportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const marginX = 20;
    const pitchTop = 35;
    const pitchWidth = 170;
    const pitchHeight = 240;

    doc.setFontSize(16);
    doc.text(title || "Planche tactique", marginX, 15);
    if (description) {
      doc.setFontSize(10);
      doc.text(description, marginX, 22, { maxWidth: pitchWidth });
    }

    // Terrain
    doc.setFillColor(46, 125, 67);
    doc.rect(marginX, pitchTop, pitchWidth, pitchHeight, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.rect(marginX + 3, pitchTop + 3, pitchWidth - 6, pitchHeight - 6);
    doc.line(marginX + 3, pitchTop + pitchHeight / 2, marginX + pitchWidth - 3, pitchTop + pitchHeight / 2);
    doc.circle(marginX + pitchWidth / 2, pitchTop + pitchHeight / 2, pitchWidth * 0.13);

    const toXY = (x: number, y: number) => ({
      px: marginX + (x / 100) * pitchWidth,
      py: pitchTop + (y / 100) * pitchHeight,
    });

    for (const el of elements) {
      const { px, py } = toXY(el.x, el.y);

      if (el.type === "ARROW" || el.type === "LINE") {
        const end = el.endPoint ?? { x: el.x, y: el.y };
        const { px: ex, py: ey } = toXY(end.x, end.y);
        doc.setDrawColor(255, 255, 0);
        doc.setLineWidth(0.8);
        doc.line(px, py, ex, ey);
        if (el.type === "ARROW") {
          const angle = Math.atan2(ey - py, ex - px);
          const headLen = 3;
          doc.line(ex, ey, ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
          doc.line(ex, ey, ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        }
        continue;
      }

      if (el.type === "PLAYER") {
        const [r, g, b] = hexToRgb(el.color || "#031521");
        doc.setFillColor(r, g, b);
        doc.circle(px, py, 3.2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(String(el.number ?? ""), px, py + 1, { align: "center" });
        doc.setTextColor(0, 0, 0);
        continue;
      }

      if (el.type === "TEXT") {
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(el.text ?? "", px, py, { align: "center" });
        doc.setTextColor(0, 0, 0);
        continue;
      }

      // Éléments matériel (ballon, plots, cônes, cages, drapeaux...) : pastille + libellé court.
      const label = PALETTE.find((p) => p.type === el.type)?.label ?? el.type;
      doc.setFillColor(255, 255, 255);
      doc.circle(px, py, 2.2, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      doc.text(label, px, py + 4.5, { align: "center" });
    }

    doc.save(`${(title || "planche-tactique").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">{boardId ? "Planche tactique" : "Nouvelle planche tactique"}</h1>
          <p className="text-muted mb-0">Glissez les éléments de la palette sur le terrain, ajustez leur position, puis enregistrez.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link href="/admin/tactics" className="btn btn-outline-secondary btn-sm">
            Retour
          </Link>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleExportPdf}>
            <i className="fas fa-file-pdf me-2" aria-hidden="true" />
            Exporter en PDF
          </button>
          {readOnly ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleDuplicate}>
              <i className="fas fa-copy me-2" aria-hidden="true" />
              Dupliquer dans mes planches
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : <i className="fas fa-save me-2" aria-hidden="true" />}
              Enregistrer
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-3">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Titre</label>
              <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={readOnly} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Description (optionnel)</label>
              <input type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} disabled={readOnly} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={readOnly}>
                <option value="">Toutes</option>
                {allowedCategories.map((c) => (
                  <option key={c} value={c}>
                    {AGE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} disabled={readOnly} />
                <label className="form-check-label" htmlFor="isPublic">
                  {isPublic ? "Publique (visible du club)" : "Privée"}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {!readOnly && (
          <div className="col-lg-2">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Palette</h6>
              </div>
              <div className="card-body d-flex flex-lg-column flex-row flex-wrap gap-2 p-2">
                {PALETTE.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    title={item.label}
                    className={`btn btn-sm ${activeTool === item.type ? "btn-secondary" : "btn-outline-secondary"} d-flex align-items-center gap-2`}
                    onClick={() => setActiveTool((prev) => (prev === item.type ? null : item.type))}
                  >
                    <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                    <span className="d-none d-lg-inline small">{item.label}</span>
                  </button>
                ))}
                <button type="button" className="btn btn-sm btn-outline-danger mt-lg-2" onClick={clearBoard}>
                  <i className="fas fa-eraser me-1" aria-hidden="true" />
                  Vider
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={readOnly ? "col-lg-9" : "col-lg-7"}>
          <div className="card">
            <div className="card-body">
              <div
                ref={pitchRef}
                onClick={handlePitchClick}
                onPointerMove={handlePitchPointerMove}
                onPointerUp={handlePitchPointerUp}
                className="position-relative w-100 rounded overflow-hidden"
                style={{ aspectRatio: "68 / 100", background: "#2e7d43", touchAction: "none", userSelect: "none", cursor: activeTool ? "crosshair" : "default" }}
              >
                <div className="position-absolute" style={{ inset: "3%", border: "2px solid rgba(255,255,255,0.85)" }} />
                <div className="position-absolute" style={{ left: "3%", right: "3%", top: "50%", height: 0, borderTop: "2px solid rgba(255,255,255,0.85)" }} />
                <div
                  className="position-absolute rounded-circle"
                  style={{ left: "50%", top: "50%", width: "26%", aspectRatio: "1 / 1", transform: "translate(-50%,-50%)", border: "2px solid rgba(255,255,255,0.85)" }}
                />
                <div className="position-absolute" style={{ left: "26%", right: "26%", top: "3%", height: "16%", border: "2px solid rgba(255,255,255,0.85)", borderTop: "none" }} />
                <div className="position-absolute" style={{ left: "26%", right: "26%", bottom: "3%", height: "16%", border: "2px solid rgba(255,255,255,0.85)", borderBottom: "none" }} />

                <svg className="position-absolute top-0 start-0 w-100 h-100" style={{ pointerEvents: "none" }}>
                  <defs>
                    <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#ffe000" />
                    </marker>
                  </defs>
                  {elements
                    .filter((el) => el.type === "ARROW" || el.type === "LINE")
                    .map((el) => {
                      const end = el.endPoint ?? { x: el.x, y: el.y };
                      return (
                        <line
                          key={el.id}
                          x1={`${el.x}%`}
                          y1={`${el.y}%`}
                          x2={`${end.x}%`}
                          y2={`${end.y}%`}
                          stroke={el.id === selectedId ? "#ffffff" : "#ffe000"}
                          strokeWidth={el.id === selectedId ? 2.5 : 2}
                          markerEnd={el.type === "ARROW" ? "url(#arrowhead)" : undefined}
                        />
                      );
                    })}
                </svg>

                {elements.map((el) => (
                  <BoardToken key={el.id} element={el} selected={el.id === selectedId} readOnly={readOnly} onPointerDownStart={handleTokenPointerDown(el.id, "point")} onPointerDownEnd={handleTokenPointerDown(el.id, "end")} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="col-lg-3">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Propriétés</h6>
              </div>
              <div className="card-body">
                {!selected ? (
                  <p className="text-muted small mb-0">Sélectionnez un élément sur le terrain pour le modifier.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    <span className="badge bg-secondary-subtle text-dark align-self-start">
                      {PALETTE.find((p) => p.type === selected.type)?.icon} {PALETTE.find((p) => p.type === selected.type)?.label}
                    </span>

                    {selected.type === "PLAYER" && (
                      <>
                        <div>
                          <label className="form-label small mb-1">Numéro</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min={0}
                            max={99}
                            value={selected.number ?? 0}
                            onChange={(e) => updateSelected({ number: parseInt(e.target.value, 10) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="form-label small mb-1">Couleur</label>
                          <div className="d-flex gap-1">
                            {PLAYER_COLORS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                title={c.label}
                                onClick={() => updateSelected({ color: c.value })}
                                className="rounded-circle border p-0"
                                style={{ width: 24, height: 24, background: c.value, outline: selected.color === c.value ? "2px solid #333" : "none" }}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {selected.type === "TEXT" && (
                      <div>
                        <label className="form-label small mb-1">Texte</label>
                        <input type="text" className="form-control form-control-sm" maxLength={100} value={selected.text ?? ""} onChange={(e) => updateSelected({ text: e.target.value })} />
                      </div>
                    )}

                    <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={deleteSelected}>
                      <i className="fas fa-trash me-1" aria-hidden="true" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardToken({
  element,
  selected,
  readOnly,
  onPointerDownStart,
  onPointerDownEnd,
}: {
  element: BoardElement;
  selected: boolean;
  readOnly: boolean;
  onPointerDownStart: (e: React.PointerEvent) => void;
  onPointerDownEnd: (e: React.PointerEvent) => void;
}) {
  const icon = PALETTE.find((p) => p.type === element.type)?.icon ?? "•";

  if (element.type === "ARROW" || element.type === "LINE") {
    const end = element.endPoint ?? { x: element.x, y: element.y };
    return (
      <>
        <div
          onPointerDown={onPointerDownStart}
          className="position-absolute rounded-circle bg-white border border-dark"
          style={{ left: `${element.x}%`, top: `${element.y}%`, width: 10, height: 10, transform: "translate(-50%,-50%)", cursor: readOnly ? "default" : "grab" }}
        />
        <div
          onPointerDown={onPointerDownEnd}
          className="position-absolute rounded-circle bg-warning border border-dark"
          style={{ left: `${end.x}%`, top: `${end.y}%`, width: 10, height: 10, transform: "translate(-50%,-50%)", cursor: readOnly ? "default" : "grab" }}
        />
      </>
    );
  }

  if (element.type === "PLAYER") {
    return (
      <div
        onPointerDown={onPointerDownStart}
        className="position-absolute rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
        style={{
          left: `${element.x}%`,
          top: `${element.y}%`,
          width: 32,
          height: 32,
          transform: "translate(-50%,-50%)",
          background: element.color ?? "#031521",
          border: selected ? "3px solid white" : "2px solid rgba(255,255,255,0.7)",
          fontSize: "0.8rem",
          cursor: readOnly ? "default" : "grab",
          touchAction: "none",
        }}
      >
        {element.number ?? ""}
      </div>
    );
  }

  if (element.type === "TEXT") {
    return (
      <div
        onPointerDown={onPointerDownStart}
        className="position-absolute text-white fw-semibold px-1 rounded"
        style={{
          left: `${element.x}%`,
          top: `${element.y}%`,
          transform: "translate(-50%,-50%)",
          background: selected ? "rgba(0,0,0,0.55)" : "transparent",
          textShadow: "0 1px 3px rgba(0,0,0,0.9)",
          cursor: readOnly ? "default" : "grab",
          touchAction: "none",
          whiteSpace: "nowrap",
        }}
      >
        {element.text || "Texte"}
      </div>
    );
  }

  return (
    <div
      onPointerDown={onPointerDownStart}
      className="position-absolute d-flex align-items-center justify-content-center"
      style={{
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: 26,
        height: 26,
        transform: "translate(-50%,-50%)",
        fontSize: "1.2rem",
        cursor: readOnly ? "default" : "grab",
        touchAction: "none",
        filter: selected ? "drop-shadow(0 0 3px white)" : undefined,
      }}
    >
      {icon}
    </div>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}