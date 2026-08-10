import { z } from "zod";

export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED"] as const;

export const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
});

export const createOrderSchema = z.object({
  userId: z.string().optional().nullable(),
  customerName: z.string().max(150).optional().nullable(),
  customerPhone: z.string().max(30).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(orderItemSchema).min(1, "Au moins un article est requis"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
