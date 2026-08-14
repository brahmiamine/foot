"use client";

import { ReactNode, ReactElement } from "react";

export type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertBannerProps {
  variant?: AlertVariant;
  title?: string;
  message?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const variantStyles: Record<AlertVariant, { container: string; icon: string; text: string }> = {
  info: {
    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    text: "text-blue-800 dark:text-blue-200",
  },
  success: {
    container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    text: "text-green-800 dark:text-green-200",
  },
  warning: {
    container: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    text: "text-amber-900 dark:text-amber-100",
  },
  error: {
    container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    text: "text-red-800 dark:text-red-200",
  },
};

const icons: Record<AlertVariant, ReactElement> = {
  info: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  success: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  warning: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h16.78a1.5 1.5 0 001.29-2.25L12 3.86z"
    />
  ),
  error: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
};

export default function AlertBanner({
  variant = "info",
  title,
  message,
  children,
  className = "",
}: AlertBannerProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${styles.container} ${className}`}>
      <span className={`mt-0.5 ${styles.icon}`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icons[variant]}
        </svg>
      </span>
      <div className="flex-1 space-y-1">
        {title && <p className={`font-semibold ${styles.text}`}>{title}</p>}
        {message && <p className={`text-sm ${styles.text}`}>{message}</p>}
        {children}
      </div>
    </div>
  );
}


