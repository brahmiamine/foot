import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { SellerUser } from "@/entities/SellerUser";
import { Seller } from "@/entities/Seller";
import { verifyPassword } from "@/lib/password";
import { issueSession } from "@/lib/session";
import { handleApiError } from "@/lib/api";
import { SellerUserStatus } from "@/entities/enums";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const ds = await getDataSource();

    const user = await ds.getRepository(SellerUser).findOne({ where: { email: body.email } });
    // Message volontairement générique (pas d'énumération de comptes).
    const invalidCredentials = () => NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });

    if (!user) return invalidCredentials();
    if (user.status !== SellerUserStatus.ACTIVE) {
      return NextResponse.json({ error: "Ce compte n'est plus actif." }, { status: 403 });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return invalidCredentials();

    const seller = await ds.getRepository(Seller).findOne({ where: { id: user.sellerId } });
    if (!seller) return invalidCredentials();

    user.lastLoginAt = new Date();
    await ds.getRepository(SellerUser).save(user);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      seller: { id: seller.id, businessName: seller.businessName, status: seller.status },
    });

    return issueSession(response, {
      sellerUserId: user.id,
      sellerId: seller.id,
      clubId: seller.clubId,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
