interface AlertAnomalyReasonsProps {
  reasons: string[];
}

export default function AlertAnomalyReasons({ reasons }: AlertAnomalyReasonsProps) {
  return (
    <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
        Raisons de l'alerte :
      </h3>
      <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
        {reasons.map((reason, idx) => (
          <li key={idx}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}
