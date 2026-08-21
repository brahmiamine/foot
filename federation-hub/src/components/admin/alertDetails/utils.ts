export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const getModerationStatusColor = (status?: string) => {
  switch (status) {
    case "validated":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "excluded":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "quarantined":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  }
};
