import { isPersonLicenseActive, type PersonLicenseStatus } from "./personLicensing";

export const STAFF_CONTRACT_ROLES = ["COACH", "ADJOINT", "KINE", "MEDECIN", "PREPARATEUR", "ANALYSTE", "EQUIPEMENTIER", "COMMUNICATION", "AUTRE"] as const;
export type StaffContractRole = (typeof STAFF_CONTRACT_ROLES)[number];
export const STAFF_CONTRACT_STATUSES = ["DRAFT", "SIGNED", "TERMINATED", "EXPIRED"] as const;
export type StaffContractStatus = (typeof STAFF_CONTRACT_STATUSES)[number];
export const STAFF_CONTRACT_FEDERAL_STATUSES = ["NOT_SUBMITTED", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type StaffContractFederalStatus = (typeof STAFF_CONTRACT_FEDERAL_STATUSES)[number];

const BUSINESS_TRANSITIONS: Record<StaffContractStatus, readonly StaffContractStatus[]> = {
  DRAFT: ["SIGNED"], SIGNED: ["TERMINATED", "EXPIRED"], TERMINATED: [], EXPIRED: [],
};
const FEDERAL_TRANSITIONS: Record<StaffContractFederalStatus, readonly StaffContractFederalStatus[]> = {
  NOT_SUBMITTED: ["SUBMITTED", "CANCELLED"], SUBMITTED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"], APPROVED: ["CANCELLED"], REJECTED: ["NOT_SUBMITTED", "CANCELLED"], CANCELLED: [],
};

export class StaffContractWorkflowError extends Error { constructor(message: string) { super(message); this.name = "StaffContractWorkflowError"; } }
export function assertStaffContractTransition(from: StaffContractStatus, to: StaffContractStatus): void { if (!BUSINESS_TRANSITIONS[from].includes(to)) throw new StaffContractWorkflowError(`Transition de contrat staff interdite : ${from} -> ${to}`); }
export function assertStaffContractFederalTransition(from: StaffContractFederalStatus, to: StaffContractFederalStatus): void { if (!FEDERAL_TRANSITIONS[from].includes(to)) throw new StaffContractWorkflowError(`Transition fédérale de contrat staff interdite : ${from} -> ${to}`); }
export function assertStaffContractDates(startDate: string | Date, endDate: string | Date): void { const start = new Date(startDate); const end = new Date(endDate); if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) throw new StaffContractWorkflowError("La date de fin doit être postérieure ou égale à la date de début"); }
export function assertStaffContractSubmittable(status: StaffContractStatus, hasCurrentDocument: boolean): void { if (status !== "SIGNED") throw new StaffContractWorkflowError("Le contrat staff doit être signé avant sa soumission"); if (!hasCurrentDocument) throw new StaffContractWorkflowError("Une version courante du contrat signé est obligatoire"); }
export function isStaffContractHomologated(status: StaffContractStatus, federalStatus: StaffContractFederalStatus, endDate: string | Date, now = new Date()): boolean { const end = new Date(endDate); end.setHours(23, 59, 59, 999); return status === "SIGNED" && federalStatus === "APPROVED" && end >= now; }
export function isStaffContractEligible(input: { status: StaffContractStatus; federalStatus: StaffContractFederalStatus; endDate: string | Date; requiresQualification: boolean; qualificationStatus?: PersonLicenseStatus | null; qualificationExpiresAt?: string | Date | null }, now = new Date()): boolean { if (!isStaffContractHomologated(input.status, input.federalStatus, input.endDate, now)) return false; if (!input.requiresQualification) return true; return input.qualificationStatus ? isPersonLicenseActive(input.qualificationStatus, input.qualificationExpiresAt, now) : false; }
export function canEditStaffContract(status: StaffContractStatus, federalStatus: StaffContractFederalStatus): boolean { return (status === "DRAFT" || status === "SIGNED") && federalStatus === "NOT_SUBMITTED"; }
