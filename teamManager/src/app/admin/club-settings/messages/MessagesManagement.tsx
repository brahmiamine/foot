"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { updateMessageStatus, deleteMessage } from "../actions";

interface MessageData {
  id: number;
  name: string;
  email: string;
  subject: string;
  department: "GENERAL" | "ADMINISTRATIF" | "SPORTIF" | "ACADEMIE" | "PARTENARIAT";
  message: string;
  status: "NEW" | "READ" | "REPLIED";
  createdAt: string;
}

const DEPARTMENT_LABELS: Record<MessageData["department"], string> = {
  GENERAL: "Général",
  ADMINISTRATIF: "Administratif",
  SPORTIF: "Sportif",
  ACADEMIE: "Académie",
  PARTENARIAT: "Partenariats",
};

const STATUS_LABELS: Record<MessageData["status"], string> = { NEW: "Nouveau", READ: "Lu", REPLIED: "Répondu" };
const STATUS_BADGE: Record<MessageData["status"], string> = { NEW: "bg-primary", READ: "bg-info text-dark", REPLIED: "bg-success" };

export function MessagesManagement({ initialMessages }: { initialMessages: MessageData[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleStatus(message: MessageData, status: MessageData["status"]) {
    await updateMessageStatus(message.id, status);
    router.refresh();
  }

  async function handleDelete(message: MessageData) {
    const ok = await confirm(`Supprimer le message de ${message.name} ?`, { variant: "danger" });
    if (!ok) return;
    await deleteMessage(message.id);
    router.refresh();
  }

  return (
    <div>
      {confirmDialog}
      <p className="text-muted mb-3">Messages reçus via le formulaire public /contact.</p>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Expéditeur</th>
              <th>Sujet</th>
              <th>Département</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {initialMessages.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  Aucun message.
                </td>
              </tr>
            )}
            {initialMessages.map((message) => (
              <React.Fragment key={message.id}>
                <tr
                  onClick={() => {
                    setExpandedId(expandedId === message.id ? null : message.id);
                    if (message.status === "NEW") handleStatus(message, "READ");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    {message.name}
                    <div className="small text-muted">{message.email}</div>
                  </td>
                  <td>{message.subject}</td>
                  <td>{DEPARTMENT_LABELS[message.department]}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[message.status]}`}>{STATUS_LABELS[message.status]}</span>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(message);
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
                {expandedId === message.id && (
                  <tr>
                    <td colSpan={5}>
                      <div className="card card-body my-2">
                        <p className="mb-3">{message.message}</p>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleStatus(message, "READ")}>
                            Marquer comme lu
                          </button>
                          <button className="btn btn-sm btn-outline-success" onClick={() => handleStatus(message, "REPLIED")}>
                            Marquer comme répondu
                          </button>
                          <a href={`mailto:${message.email}`} className="btn btn-sm btn-primary">
                            Répondre par email
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
