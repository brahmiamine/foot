import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Seller } from "@/entities/Seller";
import { getCurrentSellerSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSellerSession();
  if (!session) {
    return NextResponse.json({ user: null, seller: null });
  }

  const ds = await getDataSource();
  const seller = await ds.getRepository(Seller).findOne({ where: { id: session.sellerId } });

  return NextResponse.json({
    user: { id: session.sellerUserId, name: session.name, email: session.email, role: session.role },
    seller: seller
      ? { id: seller.id, businessName: seller.businessName, status: seller.status, logoUrl: seller.logoUrl }
      : null,
  });
}
