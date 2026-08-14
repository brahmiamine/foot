import type { TranslationKey } from "./dictionaries";

export type FeedbackParams = Record<string, string | number>;

export type ActionResult =
  | { success: true; message?: TranslationKey; messageParams?: FeedbackParams }
  | {
      success: false;
      error: TranslationKey;
      errorParams?: FeedbackParams;
      /**
       * TASK-P0-010 : vrai quand l'échec vient d'un conflit de verrou
       * optimiste (SheetVersionConflictError) — un autre officiel a
       * transitionné la feuille entre-temps. L'UI doit proposer un
       * rechargement explicite plutôt qu'un simple message d'erreur : la
       * saisie locale ne doit jamais être écrasée silencieusement par un
       * nouveau réessai automatique.
       */
      conflict?: boolean;
    };

export function translateActionFeedback(
  translate: (key: TranslationKey, values?: FeedbackParams) => string,
  code: TranslationKey,
  params?: FeedbackParams,
): string {
  return translate(code, params);
}
