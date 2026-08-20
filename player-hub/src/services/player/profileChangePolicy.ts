export const DIRECT_PROFILE_FIELDS = ["imageUrl"] as const;
export const SENSITIVE_PROFILE_FIELDS = [
  "firstNameFr",
  "lastNameFr",
  "firstNameAr",
  "lastNameAr",
  "birthDate",
  "position",
  "number",
  "category",
] as const;

export type DirectProfileField = (typeof DIRECT_PROFILE_FIELDS)[number];
export type SensitiveProfileField = (typeof SENSITIVE_PROFILE_FIELDS)[number];
export type PlayerProfileValue = string | number | null;
export type PlayerProfileChangeInput = Partial<Record<DirectProfileField | SensitiveProfileField, PlayerProfileValue>>;

function comparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

export function classifyProfileChanges(
  requested: PlayerProfileChangeInput,
  current: Record<string, unknown>,
): {
  direct: Partial<Record<DirectProfileField, PlayerProfileValue>>;
  sensitive: Partial<Record<SensitiveProfileField, PlayerProfileValue>>;
} {
  const direct: Partial<Record<DirectProfileField, PlayerProfileValue>> = {};
  const sensitive: Partial<Record<SensitiveProfileField, PlayerProfileValue>> = {};

  for (const field of DIRECT_PROFILE_FIELDS) {
    if (!(field in requested)) continue;
    const value = requested[field];
    if (comparable(value) !== comparable(current[field])) direct[field] = value;
  }
  for (const field of SENSITIVE_PROFILE_FIELDS) {
    if (!(field in requested)) continue;
    const value = requested[field];
    if (comparable(value) !== comparable(current[field])) sensitive[field] = value;
  }

  return { direct, sensitive };
}
