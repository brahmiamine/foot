import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Gestion centralisée des erreurs API : chaque route les laisse remonter
 * (throw) et handleApiError() les traduit en réponse HTTP cohérente. Évite
 * de dupliquer des try/catch avec des codes de statut à deviner dans
 * chaque route.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Données invalides.", issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }

  const status = (error as { status?: number })?.status;
  if (typeof status === "number") {
    return NextResponse.json({ error: (error as Error).message }, { status });
  }

  console.error("[api] Unhandled error", error);
  return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
}
