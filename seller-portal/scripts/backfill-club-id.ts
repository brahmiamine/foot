/**
 * Rattache un club_id aux lignes sp_sellers/sp_product_categories créées
 * avant l'ajout du scoping multi-club (sql/migration_add_club_id.sql,
 * additive/nullable en base pour ne pas casser une install existante —
 * voir avancement.md, "seller-portal — rattachement club_id en prod").
 * Jusqu'ici documenté comme "à renseigner manuellement" (UPDATE SQL brut,
 * sans validation) : ce script rend l'opération sûre et scriptable.
 *
 * Usage :
 *   cp .env.example .env.local   # renseigner DB_* (voir ../start.sh)
 *   npm run backfill:club-id                  # déduit le club automatiquement si sans ambiguïté
 *   npm run backfill:club-id -- --club-id=<uuid>   # force un club précis
 *
 * Sans --club-id, le script ne devine JAMAIS s'il existe plusieurs clubs
 * candidats plausibles (plusieurs club_id déjà utilisés, ou plusieurs clubs
 * dans `teams` sans aucun signal d'usage) : il liste la situation et
 * s'arrête, plutôt que d'assigner un club au hasard. Idempotent : aucune
 * ligne à corriger => sortie immédiate sans écriture.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import "reflect-metadata";
import { IsNull } from "typeorm";
import { getDataSource } from "../src/lib/database";
import { Seller } from "../src/entities/Seller";
import { ProductCategory } from "../src/entities/ProductCategory";
import { Team } from "../src/entities/Team";

function parseExplicitClubId(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--club-id="));
  return arg ? arg.slice("--club-id=".length) : null;
}

async function main() {
  const ds = await getDataSource();
  const sellerRepo = ds.getRepository(Seller);
  const categoryRepo = ds.getRepository(ProductCategory);
  const teamRepo = ds.getRepository(Team);

  const nullSellers = await sellerRepo.count({ where: { clubId: IsNull() } });
  const nullCategories = await categoryRepo.count({ where: { clubId: IsNull() } });

  if (nullSellers === 0 && nullCategories === 0) {
    console.log("Rien à faire : aucune ligne sp_sellers/sp_product_categories sans club_id.");
    await ds.destroy();
    return;
  }

  console.log(`À rattacher : ${nullSellers} vendeur(s), ${nullCategories} catégorie(s) sans club_id.`);

  let targetClubId = parseExplicitClubId();

  if (targetClubId) {
    const team = await teamRepo.findOne({ where: { id: targetClubId, teamType: "club" } });
    if (!team) {
      throw new Error(`--club-id=${targetClubId} : aucun club correspondant dans \`teams\`.`);
    }
    console.log(`Club forcé via --club-id : ${team.nom} (${team.id}).`);
  } else {
    // Pas de club explicite : n'auto-détecte que si le signal est sans
    // ambiguïté (un seul club déjà utilisé par les lignes existantes, ou
    // un seul club existe tout court dans `teams`).
    const usedSellerClubIds = await sellerRepo
      .createQueryBuilder("s")
      .select("DISTINCT s.club_id", "clubId")
      .where("s.club_id IS NOT NULL")
      .getRawMany<{ clubId: string }>();
    const usedCategoryClubIds = await categoryRepo
      .createQueryBuilder("c")
      .select("DISTINCT c.club_id", "clubId")
      .where("c.club_id IS NOT NULL")
      .getRawMany<{ clubId: string }>();
    const distinctUsedClubIds = Array.from(
      new Set([...usedSellerClubIds, ...usedCategoryClubIds].map((r) => r.clubId)),
    );

    if (distinctUsedClubIds.length === 1) {
      targetClubId = distinctUsedClubIds[0];
      console.log(`Un seul club déjà utilisé par les lignes existantes : ${targetClubId}.`);
    } else if (distinctUsedClubIds.length === 0) {
      const clubs = await teamRepo.find({ where: { teamType: "club" } });
      if (clubs.length === 1) {
        targetClubId = clubs[0].id;
        console.log(`Un seul club existe dans \`teams\` : ${clubs[0].nom} (${targetClubId}).`);
      } else {
        console.error(
          `Ambigu : ${clubs.length} clubs existent dans \`teams\` et aucune ligne sp_sellers/sp_product_categories n'a encore de club_id assigné. ` +
            `Impossible de deviner lequel — relancer avec --club-id=<uuid> parmi :\n` +
            clubs.map((t) => `  - ${t.nom} (${t.id})`).join("\n"),
        );
        await ds.destroy();
        process.exitCode = 1;
        return;
      }
    } else {
      console.error(
        `Ambigu : ${distinctUsedClubIds.length} clubs différents sont déjà utilisés par des lignes sp_sellers/` +
          `sp_product_categories existantes. Impossible de deviner lequel s'applique aux lignes restantes — ` +
          `relancer avec --club-id=<uuid> parmi :\n` +
          distinctUsedClubIds.map((id) => `  - ${id}`).join("\n"),
      );
      await ds.destroy();
      process.exitCode = 1;
      return;
    }
  }

  const sellerResult = await sellerRepo
    .createQueryBuilder()
    .update(Seller)
    .set({ clubId: targetClubId })
    .where("club_id IS NULL")
    .execute();
  const categoryResult = await categoryRepo
    .createQueryBuilder()
    .update(ProductCategory)
    .set({ clubId: targetClubId })
    .where("club_id IS NULL")
    .execute();

  console.log(
    `Rattachés à ${targetClubId} : ${sellerResult.affected ?? 0} vendeur(s), ${categoryResult.affected ?? 0} catégorie(s).`,
  );

  await ds.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
