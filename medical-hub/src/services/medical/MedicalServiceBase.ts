import { getDataSource } from "@/lib/database";
import type { InjuryDocument } from "@/entities/Injury";
import type { AgeCategory } from "@/types/categories";

export type CategoryScope = "ALL" | AgeCategory[];

export function parseInjuryDocuments(value?: string | null): InjuryDocument[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (document): document is InjuryDocument =>
        typeof document === "object" &&
        document !== null &&
        typeof (document as { name?: unknown }).name === "string" &&
        typeof (document as { url?: unknown }).url === "string",
    );
  } catch {
    return [];
  }
}

export class MedicalServiceBase {
  protected async ds() {
    return getDataSource();
  }
}
