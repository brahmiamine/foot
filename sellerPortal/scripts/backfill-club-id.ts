/**
 * Backfill de `sp_sellers.club_id` / `sp_product_categories.club_id` pour
 * une installation bootstrapée avant `sql/migration_add_club_id.sql` (voir
 * README.md § « Portée V1 — scoping multi-clubs »). Les deux entités
 * déclarent `clubId` `NOT NULL` côté TypeORM : une ligne encore à `NULL` en
 * base (legacy) casse silencieusement tout code qui lit `seller.clubId`
 * comme une `string` garantie.
 *
 * Usage :
 *   cp .env.example .env.local   # renseigner DB_* (voir ../start.sh)
 *   npm run backfill:club-id
 *
 * Idempotent (ne touche que les lignes à `club_id IS NULL`) mais PAS
 * automatique dans le cas général : n'assigne un club que si la table
 * `teams` partagée n'en contient exactement qu'un seul (`teamType =
 * 'club'`) — le cas réel de la quasi-totalité des installs existants,
 * qui datent d'avant le support multi-clubs. S'il y en a plusieurs,
 * aucune donnée de `sp_sellers`/`sp_product_categories` ne permet de
 * deviner lequel est le bon : le script s'arrête et liste les lignes
 * concernées pour une résolution manuelle (voir README.md), plutôt que
 * de risquer d'assigner le mauvais club à un vendeur existant.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import "reflect-metadata";
import { IsNull } from "typeorm";
import { getDataSource } from "../src/lib/database";
import { Seller } from "../src/entities/Seller";
import { ProductCategory } from "../src/entities/ProductCategory";
import { Team } from "../src/entities/Team";

async function main() {
  const ds = await getDataSource();

  const sellerRepo = ds.getRepository(Seller);
  const categoryRepo = ds.getRepository(ProductCategory);
  const teamRepo = ds.getRepository(Team);

  const orphanSellers = await sellerRepo.find({ where: { clubId: IsNull() } });
  const orphanCategories = await categoryRepo.find({ where: { clubId: IsNull() } });

  if (orphanSellers.length === 0 && orphanCategories.length === 0) {
    console.log("✅ Aucune ligne à club_id NULL — rien à backfiller.");
    await ds.destroy();
    return;
  }

  const clubs = await teamRepo.find({ where: { teamType: "club" } });

  if (clubs.length !== 1) {
    console.error(
      `❌ Backfill impossible automatiquement : la table \`teams\` partagée contient ${clubs.length} club(s) (attendu : exactement 1 pour déduire sans ambiguïté le club des lignes orphelines).`,
    );
    console.error(
      `   ${orphanSellers.length} vendeur(s) et ${orphanCategories.length} catégorie(s) ont club_id = NULL.`,
    );
    console.error(
      "   Résolution manuelle requise (voir README.md § « Portée V1 — scoping multi-clubs ») : assigner le bon teams.id club par club, ex. :",
    );
    console.error("     UPDATE sp_sellers SET club_id = '<teams.id>' WHERE id = '<seller.id>';");
    process.exitCode = 1;
    await ds.destroy();
    return;
  }

  const club = clubs[0];
  console.log(`🔧 Un seul club trouvé (${club.nom}, ${club.id}) : backfill vers ce club.`);

  if (orphanSellers.length > 0) {
    await sellerRepo.update({ clubId: IsNull() }, { clubId: club.id });
    console.log(`✅ ${orphanSellers.length} vendeur(s) rattaché(s) à ${club.nom}.`);
  }
  if (orphanCategories.length > 0) {
    await categoryRepo.update({ clubId: IsNull() }, { clubId: club.id });
    console.log(`✅ ${orphanCategories.length} catégorie(s) rattachée(s) à ${club.nom}.`);
  }

  await ds.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
