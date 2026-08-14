"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { deleteTacticsBoard } from "./actions";

export function DeleteTacticsBoardButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const handleDelete = async () => {
    if (!(await confirm(`Supprimer la planche "${title}" ?`))) return;
    setDeleting(true);
    try {
      await deleteTacticsBoard(id);
      startTransition(() => router.refresh());
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {confirmDialog}
      <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleDelete} disabled={deleting || isPending}>
        {deleting ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : <i className="fas fa-trash" aria-hidden="true" />}
      </button>
    </>
  );
}
