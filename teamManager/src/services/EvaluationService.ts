import { getDataSource } from "@/lib/database";
import { PlayerEvaluation } from "@/entities/PlayerEvaluation";
import { PlayerObjective, PlayerObjectiveStatus } from "@/entities/PlayerObjective";
import { Repository } from "typeorm";

/**
 * Service for player evaluation/progression tracking — évaluations
 * périodiques (technique/tactique/physique/mentale) et objectifs
 * individuels, pour le suivi du développement des jeunes joueurs.
 */
export class EvaluationService {
  private async getEvaluationRepository(): Promise<Repository<PlayerEvaluation>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PlayerEvaluation);
  }

  private async getObjectiveRepository(): Promise<Repository<PlayerObjective>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PlayerObjective);
  }

  async findAllEvaluations(teamId: string): Promise<PlayerEvaluation[]> {
    const repository = await this.getEvaluationRepository();
    return repository.find({ where: { teamId }, relations: ["player", "evaluator", "season"], order: { evaluationDate: "DESC" } });
  }

  async findEvaluationsForPlayer(teamId: string, playerId: string): Promise<PlayerEvaluation[]> {
    const repository = await this.getEvaluationRepository();
    return repository.find({ where: { teamId, playerId }, order: { evaluationDate: "DESC" } });
  }

  async createEvaluation(
    data: {
      playerId: string;
      seasonId?: number | null;
      evaluationDate: string;
      technicalScore?: number | null;
      tacticalScore?: number | null;
      physicalScore?: number | null;
      mentalScore?: number | null;
      comment?: string | null;
    },
    teamId: string,
    evaluatorId: string | null
  ): Promise<PlayerEvaluation> {
    const repository = await this.getEvaluationRepository();
    const evaluation = repository.create({ ...data, teamId, evaluatorId });
    return repository.save(evaluation);
  }

  async deleteEvaluation(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getEvaluationRepository();
    const evaluation = await repository.findOne({ where: { id, teamId } });
    if (!evaluation) throw new Error("Évaluation non trouvée");
    await repository.remove(evaluation);
    return true;
  }

  // ---- Objectives -----------------------------------------------------

  async findAllObjectives(teamId: string): Promise<PlayerObjective[]> {
    const repository = await this.getObjectiveRepository();
    return repository.find({ where: { teamId }, relations: ["player"], order: { targetDate: "ASC" } });
  }

  async findObjectivesForPlayer(teamId: string, playerId: string): Promise<PlayerObjective[]> {
    const repository = await this.getObjectiveRepository();
    return repository.find({ where: { teamId, playerId }, order: { targetDate: "ASC" } });
  }

  async createObjective(
    data: { playerId: string; evaluationId?: number | null; title: string; description?: string | null; targetDate?: string | null },
    teamId: string
  ): Promise<PlayerObjective> {
    const repository = await this.getObjectiveRepository();
    const objective = repository.create({ ...data, teamId, status: "IN_PROGRESS" });
    return repository.save(objective);
  }

  async setObjectiveStatus(id: number, teamId: string, status: PlayerObjectiveStatus): Promise<PlayerObjective> {
    const repository = await this.getObjectiveRepository();
    const objective = await repository.findOne({ where: { id, teamId } });
    if (!objective) throw new Error("Objectif non trouvé");
    objective.status = status;
    return repository.save(objective);
  }

  async deleteObjective(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getObjectiveRepository();
    const objective = await repository.findOne({ where: { id, teamId } });
    if (!objective) throw new Error("Objectif non trouvé");
    await repository.remove(objective);
    return true;
  }
}
