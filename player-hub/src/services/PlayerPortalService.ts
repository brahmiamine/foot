import { PlayerPlanningService } from "./player/PlayerPlanningService";

export type { MatchInfo } from "./player/PlayerServiceBase";

/**
 * Façade stable de l'espace joueur.
 *
 * Les responsabilités sont réparties dans `services/player/*` afin de garder
 * les règles de sécurité et les requêtes liées au joueur isolées par domaine,
 * tout en conservant le même point d'entrée pour les pages et Server Actions.
 */
export class PlayerPortalService extends PlayerPlanningService {}

export const playerPortalService = new PlayerPortalService();
