"use client";

import { FaCheckCircle, FaExclamationTriangle, FaTimes } from "react-icons/fa";

interface SuccessModalProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  onClose: () => void;
}

export default function SuccessModal({ t, onClose }: SuccessModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer */}
        <button
          type="button"
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <FaTimes className="h-5 w-5" />
        </button>

        {/* Icône de succès */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
            <FaCheckCircle className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Titre */}
        <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {t("voteForm.modalTitle")}
        </h3>

        {/* Message de succès */}
        <div className="space-y-4 mt-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-300">
              {t("voteForm.success")}
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <FaExclamationTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {t("voteForm.cannotChange")}
            </p>
          </div>
        </div>

        {/* Bouton de fermeture */}
        <button
          type="button"
          className="mt-6 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition shadow-lg shadow-green-500/25"
          onClick={onClose}
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
