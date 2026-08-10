import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { UserService } from "@/services/UserService";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // `User.email` porte une contrainte UNIQUE globale (tous clubs
        // confondus, table partagée avec cardManager) : un email identifie
        // un seul compte, donc un seul club. Pas besoin de le faire choisir
        // à la connexion, le club est simplement celui du compte trouvé.
        const userService = new UserService();
        const user = await userService.findByEmail(credentials.email as string);

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;

        // SUPERADMIN (sans club, réservé à cardManager) n'a jamais accès à teamManager.
        if (!user.teamId) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          teamId: user.teamId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { role?: string; id?: string; teamId?: string | null };
        token.role = u.role;
        token.id = u.id;
        token.teamId = u.teamId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as { role?: unknown; id?: unknown; teamId?: unknown };
        u.role = token.role;
        u.id = token.id;
        u.teamId = token.teamId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
