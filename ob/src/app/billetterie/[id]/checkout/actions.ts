"use server";

import { z } from "zod";
import { getObTeam } from "@/lib/ob-team";
import { getSsoSession } from "@/lib/ssoSession";
import { TicketPurchaseService, type IssuedTicketResult } from "@/services/TicketPurchaseService";

const customerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  email: z.string().email("Email invalide"),
  phone: z.string().max(30).optional().nullable(),
});

export async function confirmTicketOrder(
  orderId: number,
  formData: FormData
): Promise<{ success: true; orderNumber: string; tickets: IssuedTicketResult[] } | { success: false; error: string }> {
  try {
    const team = await getObTeam();
    if (!team) throw new Error("Club non configuré");

    const data = customerSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: (formData.get("phone") as string) || null,
    });

    const session = await getSsoSession();
    const userId = session && session.role === "MEMBER" ? session.id : null;

    const service = new TicketPurchaseService();
    const { order, tickets } = await service.confirmOrder(orderId, team.id, { ...data, phone: data.phone ?? null, userId });

    return { success: true, orderNumber: order.orderNumber, tickets };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la confirmation" };
  }
}
