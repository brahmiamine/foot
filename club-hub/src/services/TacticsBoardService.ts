import { getDataSource } from "@/lib/database";
import { TacticsBoard } from "@/entities/TacticsBoard";
import { Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";
import type { BoardContent } from "@/types/tactics";

/**
 * Service for TacticsBoard operations — planches tactiques des coachs
 * (privées par défaut, partageables en lecture au sein du club).
 */
export class TacticsBoardService {
  private async getRepository(): Promise<Repository<TacticsBoard>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TacticsBoard);
  }

  /** Planches visibles par l'utilisateur : les siennes + les publiques du club. */
  async findVisible(teamId: string, userId: string): Promise<TacticsBoard[]> {
    const repository = await this.getRepository();
    return repository
      .createQueryBuilder("board")
      .leftJoinAndSelect("board.owner", "owner")
      .where("board.teamId = :teamId", { teamId })
      .andWhere("(board.ownerId = :userId OR board.isPublic = true)", { userId })
      .orderBy("board.updatedAt", "DESC")
      .getMany();
  }

  async findById(id: number, teamId: string): Promise<TacticsBoard | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["owner"] });
  }

  /** true si l'utilisateur peut voir cette planche (propriétaire ou publique). */
  canView(board: TacticsBoard, userId: string): boolean {
    return board.ownerId === userId || board.isPublic;
  }

  async create(
    data: { title: string; description?: string | null; category?: AgeCategory | null; isPublic: boolean; content: BoardContent },
    teamId: string,
    ownerId: string
  ): Promise<TacticsBoard> {
    const repository = await this.getRepository();
    const board = repository.create({
      teamId,
      ownerId,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      isPublic: data.isPublic,
      content: JSON.stringify(data.content),
    });
    return repository.save(board);
  }

  async update(
    id: number,
    teamId: string,
    ownerId: string,
    data: Partial<{ title: string; description: string | null; category: AgeCategory | null; isPublic: boolean; content: BoardContent }>
  ): Promise<TacticsBoard> {
    const repository = await this.getRepository();
    const board = await this.findById(id, teamId);
    if (!board) {
      throw new Error("Planche tactique non trouvée");
    }
    if (board.ownerId !== ownerId) {
      throw new Error("Seul l'auteur peut modifier cette planche");
    }

    if (data.title !== undefined) board.title = data.title;
    if (data.description !== undefined) board.description = data.description;
    if (data.category !== undefined) board.category = data.category;
    if (data.isPublic !== undefined) board.isPublic = data.isPublic;
    if (data.content !== undefined) board.content = JSON.stringify(data.content);

    return repository.save(board);
  }

  async delete(id: number, teamId: string, ownerId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const board = await this.findById(id, teamId);
    if (!board) {
      throw new Error("Planche tactique non trouvée");
    }
    if (board.ownerId !== ownerId) {
      throw new Error("Seul l'auteur peut supprimer cette planche");
    }
    await repository.remove(board);
    return true;
  }

  static parseContent(board: TacticsBoard): BoardContent {
    try {
      const parsed = JSON.parse(board.content);
      return parsed && Array.isArray(parsed.elements) ? parsed : { elements: [] };
    } catch {
      return { elements: [] };
    }
  }
}
