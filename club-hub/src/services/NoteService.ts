import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Note, type NoteCategory } from "@/entities/Note";
import { Repository } from "typeorm";

export interface CreateNoteInput {
  contentFr: string;
  contentAr?: string | null;
  category: NoteCategory;
  playerId?: string | null;
  matchId?: string | null;
}

export interface UpdateNoteInput {
  contentFr?: string;
  contentAr?: string | null;
  category?: NoteCategory;
}

/**
 * Service for Note operations — port de cardManager/app/api/notes.
 */
export class NoteService {
  private async getRepository(): Promise<Repository<Note>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Note);
  }

  async findAllByTeam(teamId: string): Promise<Note[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      relations: { author: true, player: true, match: { matchday: true, homeTeam: true, awayTeam: true } },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async findById(id: string, teamId: string): Promise<Note | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async create(data: CreateNoteInput, teamId: string, authorId: string): Promise<Note> {
    const repository = await this.getRepository();
    const note = repository.create({
      id: randomUUID(),
      contentFr: data.contentFr,
      contentAr: data.contentAr ?? null,
      category: data.category,
      playerId: data.playerId ?? null,
      matchId: data.matchId ?? null,
      authorId,
      teamId,
    });
    return repository.save(note);
  }

  async update(id: string, teamId: string, data: UpdateNoteInput): Promise<{ before: Note; after: Note }> {
    const repository = await this.getRepository();
    const before = await this.findById(id, teamId);
    if (!before) throw new Error("Note non trouvée");
    const beforeSnapshot = { ...before } as Note;

    Object.assign(before, data);
    const after = await repository.save(before);
    return { before: beforeSnapshot, after };
  }

  async delete(id: string, teamId: string): Promise<Note> {
    const repository = await this.getRepository();
    const note = await this.findById(id, teamId);
    if (!note) throw new Error("Note non trouvée");
    await repository.remove(note);
    return note;
  }
}
