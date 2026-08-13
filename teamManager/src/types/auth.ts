export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN" | "PLATFORM_SUPERADMIN" | "FEDERATION_ADMIN" | "LEAGUE_ADMIN";
  teamId: string | null;
}
