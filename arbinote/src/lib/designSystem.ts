export type AccentKey = "arbitre" | "var" | "assistant" | "global" | "neutral";

export interface AccentStyles {
  text: string;
  tile: string;
}

const accentStylesMap: Record<AccentKey, AccentStyles> = {
  arbitre: {
    text: "text-blue-600 dark:text-blue-400",
    tile: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  var: {
    text: "text-green-600 dark:text-green-400",
    tile: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  },
  assistant: {
    text: "text-amber-600 dark:text-amber-400",
    tile: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  },
  global: {
    text: "text-purple-600 dark:text-purple-400",
    tile: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  },
  neutral: {
    text: "text-gray-700 dark:text-gray-300",
    tile: "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700",
  },
};

export function getAccentStyles(accent?: string | null): AccentStyles {
  if (!accent) {
    return accentStylesMap.neutral;
  }

  if ((accentStylesMap as Record<string, AccentStyles>)[accent]) {
    return (accentStylesMap as Record<string, AccentStyles>)[accent];
  }

  return accentStylesMap.neutral;
}

export function getCategoryAccent(category?: string | null): AccentStyles {
  switch (category) {
    case "arbitre":
      return accentStylesMap.arbitre;
    case "var":
      return accentStylesMap.var;
    case "assistant":
      return accentStylesMap.assistant;
    default:
      return accentStylesMap.neutral;
  }
}


