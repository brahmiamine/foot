import { headers } from "next/headers";
import { getDataSource } from "./db";
import { AuditLog } from "@/entities/AuditLog";

const APP_SOURCE = "matchsheet";

interface LogActionParams {
  action: "create" | "update" | "delete";
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
}

/**
 * Journal d'audit matchsheet, table `audit_logs` partagée avec
 * arbinote/superadmin. matchsheet n'en avait aucun avant ce fix — impossible
 * de savoir qui avait rempli/modifié une feuille de match, alors que le SSO
 * connaît précisément l'utilisateur derrière chaque action.
 * Best-effort : ne doit jamais faire échouer l'action elle-même (même
 * principe que dans arbinote/superadmin).
 */
export async function logMatchsheetAction({ action, entityType, entityId, summary }: LogActionParams): Promise<void> {
  try {
    const requestHeaders = await headers();
    const actor = requestHeaders.get("x-sso-name") || requestHeaders.get("x-sso-user-id") || null;

    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(AuditLog);
    const entry = repo.create({
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      summary: summary ?? null,
      admin_username: actor,
      app_source: APP_SOURCE,
    });
    await repo.save(entry);
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}
