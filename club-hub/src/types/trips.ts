import { z } from "zod";
import { AGE_CATEGORIES } from "./categories";

export const TRIP_VEHICLE_TYPES = ["BUS", "MINIBUS", "CAR", "OTHER"] as const;
export const TRIP_PARTICIPANT_TYPES = ["PLAYER", "PARENT", "STAFF"] as const;
export const TRIP_TRANSPORT_OFFERS = ["NONE", "NEEDS_TRANSPORT", "CAN_DRIVE"] as const;

export const tripVehicleSchema = z.object({
  vehicleType: z.enum(TRIP_VEHICLE_TYPES).default("MINIBUS"),
  label: z.string().max(100).optional().nullable(),
  driverName: z.string().max(150).optional().nullable(),
  seats: z.number().int().min(0).max(200).default(0),
});

export const createTripSchema = z.object({
  category: z.enum(AGE_CATEGORIES).default("seniors"),
  matchType: z.enum(["OFFICIAL", "FRIENDLY"]).optional().nullable(),
  matchId: z.string().optional().nullable(),
  friendlyMatchId: z.number().int().positive().optional().nullable(),
  departureTime: z.date({ error: "L'heure de départ est requise" }),
  meetingPoint: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  vehicles: z.array(tripVehicleSchema).max(20).default([]),
});

export const updateTripSchema = createTripSchema.partial();

export const addTripParticipantSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  participantType: z.enum(TRIP_PARTICIPANT_TYPES).default("PLAYER"),
  playerId: z.string().optional().nullable(),
  name: z.string().max(150).optional().nullable(),
  transportOffer: z.enum(TRIP_TRANSPORT_OFFERS).default("NONE"),
  offeredSeats: z.number().int().min(0).max(20).optional().nullable(),
});

const moneySchema = z.coerce.number().finite().min(0).max(1_000_000_000);

export const tripGovernanceSettingsSchema = z.object({
  dualApprovalThreshold: moneySchema,
  receiptRequiredThreshold: moneySchema,
});

export const submitTripBudgetSchema = z.object({
  estimatedBudget: moneySchema,
});

export const tripDecisionReasonSchema = z.object({
  reason: z.string().trim().min(3, "Le motif doit contenir au moins 3 caractères").max(2000),
});

export const tripConsentSchema = z.object({
  granted: z.enum(["true", "false"]).transform((value) => value === "true"),
  note: z.string().trim().max(2000).optional().nullable(),
});

const tripEvidenceLocationSchema = z
  .string()
  .trim()
  .max(255)
  .refine(
    (value) => /^https?:\/\//i.test(value) || /^\/uploads\/trips\/[A-Za-z0-9._-]+$/.test(value),
    "Emplacement du justificatif invalide",
  );

export const tripExpenseSchema = z.object({
  label: z.string().trim().min(1, "Libellé obligatoire").max(150),
  amount: moneySchema.refine((value) => value > 0, "Le montant doit être strictement positif"),
  documentUrl: z.union([tripEvidenceLocationSchema, z.literal("")]).optional().nullable().transform((value) => value || null),
});

export const cancelTripSchema = tripDecisionReasonSchema;

export type TripVehicleInput = z.infer<typeof tripVehicleSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type AddTripParticipantInput = z.infer<typeof addTripParticipantSchema>;
export type TripGovernanceSettingsInput = z.infer<typeof tripGovernanceSettingsSchema>;
export type SubmitTripBudgetInput = z.infer<typeof submitTripBudgetSchema>;
export type TripExpenseFormInput = z.infer<typeof tripExpenseSchema>;
