import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import type { AgeCategory } from "@/types/categories";

export type CategoryScope = "ALL" | AgeCategory[];

export interface MatchInfo {
  kind: "OFFICIAL" | "FRIENDLY";
  id: string;
  date: Date | null;
  opponentName: string;
  isHome: boolean;
  status: string;
}

export function categoryWhere(categories: CategoryScope) {
  return categories === "ALL" ? undefined : In(categories);
}

export class StaffServiceBase {
  protected async ds() {
    return getDataSource();
  }
}
