import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildLoginUrlForPath } from "@/lib/ssoSession";

export const dynamic = "force-dynamic";

/**
 * TeamManager sert plusieurs clubs depuis un seul déploiement : il n'y a
 * plus "un" site public associé à `/` (chaque club aura son propre site
 * public plus tard, ex. /clubs/[teamId]). En attendant, `/` redirige vers
 * l'admin (ou la connexion SSO) du club de l'utilisateur connecté.
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect(await buildLoginUrlForPath("/admin"));
  redirect("/admin");
}
