"use client";

import AlertsTable from "./alerts/AlertsTable";
import { useAdminAlerts } from "./alerts/useAdminAlerts";

export default function AdminAlertsManager() {
  const {
    alerts,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    refreshing,
    resolving,
    fetchAlerts,
    handleResolve,
    handleDismiss,
  } = useAdminAlerts();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement des alertes...</p>
        </div>
      </div>
    );
  }

  const newAlerts = alerts.filter((a) => a.status === "new").length;
  const criticalAlerts = alerts.filter((a) => a.alert_type === "critical" && a.status !== "resolved" && a.status !== "dismissed").length;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Alertes de Manipulation
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Alertes automatiques pour les matchs suspects
          </p>
        </div>
        <div className="flex items-center gap-4">
          {criticalAlerts > 0 && (
            <div className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm font-semibold dark:bg-red-900/30 dark:text-red-300">
              {criticalAlerts} critique{criticalAlerts > 1 ? "s" : ""}
            </div>
          )}
          {newAlerts > 0 && (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-semibold dark:bg-blue-900/30 dark:text-blue-300">
              {newAlerts} nouvelle{newAlerts > 1 ? "s" : ""}
            </div>
          )}
          <button
            onClick={fetchAlerts}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Statut:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="all">Tous</option>
            <option value="new">Nouvelles</option>
            <option value="reviewed">En cours</option>
            <option value="resolved">Résolues</option>
            <option value="dismissed">Ignorées</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300 mr-2">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="all">Tous</option>
            <option value="critical">Critiques</option>
            <option value="important">Importantes</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <AlertsTable
        alerts={alerts}
        resolving={resolving}
        onResolve={handleResolve}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
