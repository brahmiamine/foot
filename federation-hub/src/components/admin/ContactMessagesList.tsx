"use client";

import { useState, useEffect } from "react";

interface ContactMessage {
  id: string;
  email: string;
  subject: string;
  message: string;
  device_fingerprint?: string | null;
  created_at: string | Date;
}

export default function ContactMessagesList() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/arbitrage/arbinote/contact");
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Non autorisé. Veuillez vous reconnecter.");
        }
        throw new Error("Erreur lors du chargement des messages");
      }

      const data = await response.json();
      setMessages(data);
      // Sélectionner automatiquement le premier message s'il existe
      if (data.length > 0 && !selectedMessage) {
        setSelectedMessage(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Liste des messages à gauche (col-8 ou col-12 si pas de message sélectionné) */}
      <div className={`${selectedMessage ? 'col-span-12 md:col-span-8' : 'col-span-12'} bg-white dark:bg-gray-800 shadow rounded-lg p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Messages ({messages.length})
          </h3>
        </div>

        {messages.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Aucun message de contact pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
                  selectedMessage?.id === message.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-md'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => setSelectedMessage(message)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                      {message.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {message.subject}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">
                      {message.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(message.created_at)}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mt-2">
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Détails du message à droite (col-4) */}
      {selectedMessage && (
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400">Détails du message</h3>
            <button
              onClick={() => setSelectedMessage(null)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline"
            >
              ✕ Fermer
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Sujet</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {selectedMessage.subject}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</p>
              <p className="text-base text-gray-900 dark:text-white break-all">
                {selectedMessage.email}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date</p>
              <p className="text-base text-gray-900 dark:text-white">
                {formatDate(selectedMessage.created_at)}
              </p>
            </div>
            
            {selectedMessage.device_fingerprint && (
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Empreinte</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                  {selectedMessage.device_fingerprint}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Message</p>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                  {selectedMessage.message}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
              className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-center"
            >
              Répondre par email
            </a>
            <button
              onClick={() => setSelectedMessage(null)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

