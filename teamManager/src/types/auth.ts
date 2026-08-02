export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN";
  teamId: string | null;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
  interface User {
    role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN";
    teamId: string | null;
  }
}

declare module "next-auth" {
  interface JWT {
    role: "ADMIN" | "OBSERVATEUR" | "SUPERADMIN";
    id: string;
    teamId: string | null;
  }
}
