import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Gestion centralisée des erreurs API : chaque route les laisse remonter
 * (throw) et handleApiError() les traduit en réponse HTTP cohérente. Même
 * convention que sellerPortal/src/lib/api.ts.
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
    // profileUrl : voir ProfileIncompleteError (lib/errors.ts) — porté par
    // ce champ optionnel plutôt qu'un nouveau cas dans ce switch générique,
    // pour rester extensible à d'autres erreurs qui voudraient transporter
    // une donnée structurée en plus du message.
    const profileUrl = (error as { profileUrl?: string }).profileUrl;
    return NextResponse.json(
      { error: (error as Error).message, ...(profileUrl ? { profileUrl } : {}) },
      { status },
    );
  }

  console.error("[api] Unhandled error", error);
  return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
}
