import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { ObPrediction } from "@/entities/ObPrediction";

export class PredictionService {
  async getForUserByMatch(userId: string, matchIds: string[]): Promise<Map<string, ObPrediction>> {
    if (matchIds.length === 0) return new Map();
    const dataSource = await getDataSource();
    const predictions = await dataSource
      .getRepository(ObPrediction)
      .find({ where: { userId, matchId: In(matchIds) } });
    return new Map(predictions.map((p) => [p.matchId, p]));
  }
}
