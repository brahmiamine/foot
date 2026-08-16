import { unstable_cache } from "next/cache";

/**
 * Cache server-side des lectures publiques du site du club.
 *
 * Le site reste dynamique pour la locale et la session éventuelle, mais les
 * données MariaDB partagées n'ont pas besoin d'être relues à chaque requête.
 * Les clés sont explicites afin d'isoler chaque club et chaque variante.
 */
export function cachePublicData<T>(
  keyParts: string[],
  loader: () => Promise<T>,
  revalidate = 60
): Promise<T> {
  return unstable_cache(loader, ["club-ob-public", ...keyParts], { revalidate })();
}
