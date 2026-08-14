"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Styled replacement for the browser's native confirm() dialog — used via
 * the `useConfirm` hook rather than mounted directly.
 */
export function ConfirmModal({
  message,
  title = "Confirmation",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{ zIndex: 1060 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="confirm-modal-title">
                {title}
              </h5>
              <button type="button" className="btn-close" aria-label="Fermer" onClick={onCancel} />
            </div>
            <div className="modal-body">
              <p className="mb-0">{message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button ref={confirmButtonRef} type="button" className={`btn btn-${variant}`} onClick={onConfirm}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1055 }} onClick={onCancel} aria-hidden="true" />
    </>
  );
}
