import { z } from "zod";

export const createTicketCategorySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  nameAr: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0).default(0),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (format #RRGGBB)")
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateTicketCategorySchema = createTicketCategorySchema.partial();

export const createTicketingEventSchema = z
  .object({
    matchType: z.enum(["OFFICIAL", "FRIENDLY"]),
    matchId: z.string().optional().nullable(),
    friendlyMatchId: z.number().int().positive().optional().nullable(),
    salesStartAt: z.date().optional().nullable(),
    salesEndAt: z.date().optional().nullable(),
    maxTicketsPerOrder: z.number().int().min(1).max(50).default(5),
    categories: z
      .array(
        z.object({
          ticketCategoryId: z.number().int().positive(),
          quota: z.number().int().min(0),
        })
      )
      .default([]),
  })
  .refine((data) => (data.matchType === "OFFICIAL" ? !!data.matchId : !!data.friendlyMatchId), {
    message: "Sélectionnez un match",
    path: ["matchId"],
  });

export const updateTicketingEventSchema = z.object({
  salesStartAt: z.date().optional().nullable(),
  salesEndAt: z.date().optional().nullable(),
  maxTicketsPerOrder: z.number().int().min(1).max(50).optional(),
});

export const TICKETING_EVENT_STATUSES = ["DRAFT", "SCHEDULED", "OPEN", "CLOSED", "CANCELLED"] as const;

export const setEventCategoryQuotaSchema = z.object({
  ticketCategoryId: z.number().int().positive(),
  quota: z.number().int().min(0),
  isAvailable: z.boolean().default(true),
});

export type CreateTicketCategoryInput = z.infer<typeof createTicketCategorySchema>;
export type UpdateTicketCategoryInput = z.infer<typeof updateTicketCategorySchema>;
export type CreateTicketingEventInput = z.infer<typeof createTicketingEventSchema>;
export type UpdateTicketingEventInput = z.infer<typeof updateTicketingEventSchema>;
export type SetEventCategoryQuotaInput = z.infer<typeof setEventCategoryQuotaSchema>;
