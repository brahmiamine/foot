import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { Seller } from "@/entities/Seller";
import { SellerUser } from "@/entities/SellerUser";
import { Team } from "@/entities/Team";
import { hashPassword } from "@/lib/password";
import { handleApiError } from "@/lib/api";
import { SellerStatus, SellerUserRole } from "@/entities/enums";

const registerSchema = z.object({
  clubId: z.string().min(1, "Le club du marketplace est requis."),
  businessName: z.string().min(2).max(191),
  ownerName: z.string().min(2).max(191),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().max(32).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  activityCategory: z.string().max(120).optional(),
  taxId: z.string().max(120).optional(),
  tradeRegister: z.string().max(120).optional(),
});

// Inscription publique d'un vendeur. Aucune session n'est ouverte ici :
// le compte est créé PENDING, l'administration du club doit valider depuis
// teamManager avant que le vendeur puisse réellement vendre (voir src/lib/authz.ts).
export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());
    const ds = await getDataSource();

    const club = await ds.getRepository(Team).findOne({ where: { id: body.clubId, teamType: "club" } });
    if (!club) {
      return NextResponse.json({ error: "Club introuvable." }, { status: 400 });
    }

    const existingSeller = await ds.getRepository(Seller).findOne({ where: { email: body.email } });
    const existingUser = await ds.getRepository(SellerUser).findOne({ where: { email: body.email } });
    if (existingSeller || existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);

    const result = await ds.transaction(async (manager) => {
      const seller = manager.create(Seller, {
        clubId: body.clubId,
        businessName: body.businessName,
        ownerName: body.ownerName,
        email: body.email,
        phone: body.phone ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        country: body.country ?? null,
        description: body.description ?? null,
        activityCategory: body.activityCategory ?? null,
        taxId: body.taxId ?? null,
        tradeRegister: body.tradeRegister ?? null,
        status: SellerStatus.PENDING,
      });
      await manager.save(seller);

      const sellerUser = manager.create(SellerUser, {
        sellerId: seller.id,
        name: body.ownerName,
        email: body.email,
        passwordHash,
        role: SellerUserRole.OWNER,
      });
      await manager.save(sellerUser);

      return seller;
    });

    return NextResponse.json(
      {
        message: "Inscription reçue. Votre compte est en attente de validation par l'administration du club.",
        sellerId: result.id,
        status: result.status,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
