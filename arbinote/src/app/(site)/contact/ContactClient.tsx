"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "@/lib/i18n";
import Link from "next/link";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

interface UserMessage {
  id: string;
  email: string;
  subject: string;
  message: string;
  created_at: string | Date;
}

export default function ContactClient() {
  const { t } = useTranslations();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [canSendToday, setCanSendToday] = useState(true);

  // Charger le fingerprint
  useEffect(() => {
    let cancelled = false;
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        if (!cancelled) {
          setFingerprint(result.visitorId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFingerprint(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Charger les messages de l'utilisateur
  useEffect(() => {
    const fetchUserMessages = async () => {
      if (!fingerprint) {
        setLoadingMessages(false);
        return;
      }

      try {
        setLoadingMessages(true);
        const response = await fetch(`/api/contact/user?fingerprint=${encodeURIComponent(fingerprint)}`);
        
        if (response.ok) {
          const messages = await response.json();
          setUserMessages(messages || []);

          // Vérifier si l'utilisateur a déjà envoyé un message aujourd'hui
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const hasMessageToday = messages.some((msg: UserMessage) => {
            const msgDate = new Date(msg.created_at);
            msgDate.setHours(0, 0, 0, 0);
            return msgDate.getTime() === today.getTime();
          });
          setCanSendToday(!hasMessageToday);
        }
      } catch (err) {
        console.error('Error fetching user messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchUserMessages();
  }, [fingerprint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          device_fingerprint: fingerprint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("contact.form.error"));
      }

      // Succès
      setSuccess(true);
      setEmail("");
      setSubject("");
      setMessage("");
      setCanSendToday(false);
      
      // Recharger les messages de l'utilisateur
      if (fingerprint) {
        try {
          const response = await fetch(`/api/contact/user?fingerprint=${encodeURIComponent(fingerprint)}`);
          if (response.ok) {
            const messages = await response.json();
            setUserMessages(messages || []);
          }
        } catch (err) {
          console.error('Error reloading messages:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("contact.form.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <Link
        href="/"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-6 inline-block text-sm"
      >
        {t("common.backToHome") || "← Retour à l'accueil"}
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 md:p-10 space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t("contact.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("contact.subtitle")}
          </p>
        </div>

        {/* Afficher les anciens messages de l'utilisateur */}
        {!loadingMessages && userMessages.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("contact.previousMessages")}
            </h2>
            {userMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {msg.subject}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(msg.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {msg.email}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {msg.message}
                </p>
              </div>
            ))}
          </div>
        )}

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 text-sm sm:text-base">
              {t("contact.form.success")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!canSendToday && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm sm:text-base">
                  {t("contact.form.alreadySentToday")}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 text-sm sm:text-base">
                  {error}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("contact.form.email")} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("contact.form.emailPlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("contact.form.subject")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={500}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("contact.form.subjectPlaceholder")}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {subject.length}/500 {t("contact.form.characters")}
              </p>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("contact.form.message")} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={8}
                maxLength={5000}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                placeholder={t("contact.form.messagePlaceholder")}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {message.length}/5000 {t("contact.form.characters")}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !canSendToday || !fingerprint}
              className="btn-primary w-full sm:w-auto px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("contact.form.submitting") : t("contact.form.submit")}
            </button>
            
            {!fingerprint && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("contact.form.loadingFingerprint")}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

