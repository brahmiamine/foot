import { MedicalReportingService } from "./medical/MedicalReportingService";

export type { CategoryScope } from "./medical/MedicalServiceBase";
export type { InjuryWithPlayer } from "./medical/MedicalInjuryService";
export type { AlertEntry } from "./medical/MedicalReportingService";

/**
 * Façade stable de l'espace médical.
 *
 * Les mutations et lectures de blessures sont séparées du reporting
 * (documents, indisponibilités, alertes, synthèse) tout en conservant le même
 * contrat pour les pages et Server Actions existants.
 */
export class MedicalPortalService extends MedicalReportingService {}

export const medicalPortalService = new MedicalPortalService();
