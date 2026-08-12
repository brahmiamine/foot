import type { TranslationKey } from "./dictionaries";

export type FeedbackParams = Record<string, string | number>;

export type ActionResult =
  | { success: true; message?: TranslationKey; messageParams?: FeedbackParams }
  | { success: false; error: TranslationKey; errorParams?: FeedbackParams };

export function translateActionFeedback(
  translate: (key: TranslationKey, values?: FeedbackParams) => string,
  code: TranslationKey,
  params?: FeedbackParams,
): string {
  return translate(code, params);
}
