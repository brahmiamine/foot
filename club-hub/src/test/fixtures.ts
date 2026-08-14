import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { Product } from "@/entities/Product";
import { Team } from "@/entities/Team";

/** Club + produit actif en stock — le graphe minimal requis pour une commande boutique. */
export async function seedTeamWithProduct(
  dataSource: DataSource,
  overrides: { price?: string; stock?: number; isActive?: boolean } = {},
) {
  const teamRepo = dataSource.getRepository(Team);
  const productRepo = dataSource.getRepository(Product);

  const team = await teamRepo.save(
    teamRepo.create({
      id: randomUUID(),
      nom: "Club Test",
      teamType: "club",
      sport: "football",
      ageCategory: "seniors",
      gender: "male",
    }),
  );

  const product = await productRepo.save(
    productRepo.create({
      teamId: team.id,
      nameFr: "Maillot domicile",
      price: overrides.price ?? "20.000",
      stock: overrides.stock ?? 10,
      isActive: overrides.isActive ?? true,
    }),
  );

  return { team, product };
}
