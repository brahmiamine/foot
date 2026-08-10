import { getDataSource } from "@/lib/db";
import { Card, CardType, MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";

interface CreateCardInput {
  matchId: string;
  playerId: string;
  type: CardType;
  minute?: number | null;
  period: MatchPeriod;
  cardReasonId?: string | null;
  commentFr?: string | null;
  /** Utilisateur SSO réel qui saisit le carton (User.id), pas "matchsheet". */
  createdBy: string;
}

function getInternalHeaders() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error("INTERNAL_API_SECRET must be set");
  return { "Content-Type": "application/json", "x-internal-secret": secret };
}

function getTeamManagerUrl() {
  const url = process.env.TEAMMANAGER_URL;
  if (!url) throw new Error("TEAMMANAGER_URL must be set");
  return url;
}

/**
 * Service for Card operations. La création/suppression passe désormais par
 * l'API interne de teamManager (CardService.create/delete), qui applique
 * les règles d'amende et de suspension — matchsheet ne duplique plus cette
 * logique (voir teamManager/src/app/api/internal/cards). La lecture reste
 * directe sur la table `Card` partagée : c'est déjà une lecture seule,
 * cohérente avec le reste du repo.
 */
export class CardEventService {
  private async getRepository(): Promise<Repository<Card>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Card);
  }

  async findByMatch(matchId: string): Promise<Card[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { matchId },
      relations: ["player", "cardReason"],
      order: { minute: "ASC" },
    });
  }

  /**
   * Appel bloquant : si teamManager est injoignable, le carton n'est PAS
   * enregistré. C'est précisément le bug qu'on corrige — un carton saisi
   * sans passer par le calcul d'amende/suspension serait un faux succès.
   */
  async create(data: CreateCardInput): Promise<void> {
    const response = await fetch(`${getTeamManagerUrl()}/api/internal/cards`, {
      method: "POST",
      headers: getInternalHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Échec de l'enregistrement du carton (${response.status})`);
    }
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${getTeamManagerUrl()}/api/internal/cards/${id}`, {
      method: "DELETE",
      headers: getInternalHeaders(),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Échec de la suppression du carton (${response.status})`);
    }
  }
}
