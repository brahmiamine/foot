export interface LicenseStatusColors {
  background: string;
  color: string;
}

export const STATUS_COLORS: Record<string, LicenseStatusColors> = {
  APPROVED: { background: "#d1fae5", color: "#065f46" },
  SUSPENDED: { background: "#fef3c7", color: "#92400e" },
  EXPIRED: { background: "#e5e7eb", color: "#374151" },
  REVOKED: { background: "#fee2e2", color: "#991b1b" },
  REJECTED: { background: "#fee2e2", color: "#991b1b" },
  UNDER_REVIEW: { background: "#dbeafe", color: "#1e40af" },
  SUBMITTED: { background: "#cffafe", color: "#155e75" },
  DRAFT: { background: "#f3f4f6", color: "#4b5563" },
};
