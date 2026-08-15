import { StaffPlanningService } from "./staff/StaffPlanningService";

export type { CategoryScope, MatchInfo } from "./staff/StaffServiceBase";

/**
 * Façade stable de l'espace staff.
 *
 * Les responsabilités sont réparties dans `services/staff/*` (effectif,
 * matchs, entraînements, convocations, composition/tactique, statistiques,
 * déplacements et agenda). La classe reste le point d'entrée historique afin
 * de ne modifier aucun appelant existant.
 */
export class StaffPortalService extends StaffPlanningService {}

export const staffPortalService = new StaffPortalService();
