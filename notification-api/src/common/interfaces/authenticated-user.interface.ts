/**
 * Utilisateur authentifié via le JWT émis par `sso` (cookie ou header
 * `Authorization: Bearer`). Reflète exactement le payload signé par
 * sso/src/lib/session.ts — voir AuthModule/SsoJwtService.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
}

export interface AuthenticatedService {
  application: string;
}
