export class UnauthorizedError extends Error {
  status = 401;
}
export class ForbiddenError extends Error {
  status = 403;
}
export class NotFoundError extends Error {
  status = 404;
}
export class ConflictError extends Error {
  status = 409;
}
/**
 * Le profil MEMBER de l'acheteur n'a pas firstName/lastName/phoneNumber,
 * requis par Paymee (voir lib/paymentApiClient.ts) — jamais envoyé vide à
 * payment-api. `profileUrl` pointe vers /membre/profil sur `sso`, avec un
 * `redirect` vers la page courante pour reprendre l'achat une fois complété
 * (voir handleApiError qui le propage dans la réponse JSON).
 */
export class ProfileIncompleteError extends Error {
  status = 422;
  profileUrl: string;
  constructor(message: string, profileUrl: string) {
    super(message);
    this.profileUrl = profileUrl;
  }
}
