import { getDataSource } from "@/lib/database";
import { Document, DocumentEntityType, DocumentCategory } from "@/entities/Document";
import { LessThanOrEqual, Repository } from "typeorm";

/**
 * Service for Document operations — documents génériques attachés à
 * n'importe quelle entité du club (`entityType` + `entityId`).
 */
export class DocumentService {
  private async getRepository(): Promise<Repository<Document>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Document);
  }

  async findAll(teamId: string): Promise<Document[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, order: { createdAt: "DESC" } });
  }

  async findByEntity(teamId: string, entityType: DocumentEntityType, entityId: string): Promise<Document[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId, entityType, entityId }, order: { createdAt: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<Document | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  /** Documents dont l'échéance tombe dans les `withinDays` prochains jours (ou déjà expirés). */
  async findExpiring(teamId: string, withinDays: number): Promise<Document[]> {
    const repository = await this.getRepository();
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    const limitStr = limit.toISOString().slice(0, 10);
    return repository.find({
      where: { teamId, expiresAt: LessThanOrEqual(limitStr) },
      order: { expiresAt: "ASC" },
    });
  }

  async create(
    data: {
      entityType: DocumentEntityType;
      entityId: string;
      category?: DocumentCategory;
      title: string;
      fileUrl: string;
      issuedAt?: string | null;
      expiresAt?: string | null;
      notes?: string | null;
    },
    teamId: string,
    uploadedBy: string | null
  ): Promise<Document> {
    const repository = await this.getRepository();
    const document = repository.create({ ...data, teamId, uploadedBy });
    return repository.save(document);
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{ category: DocumentCategory; title: string; fileUrl: string; issuedAt: string | null; expiresAt: string | null; notes: string | null }>
  ): Promise<Document> {
    const repository = await this.getRepository();
    const document = await this.findById(id, teamId);
    if (!document) {
      throw new Error("Document non trouvé");
    }
    Object.assign(document, data);
    return repository.save(document);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const document = await this.findById(id, teamId);
    if (!document) {
      throw new Error("Document non trouvé");
    }
    await repository.remove(document);
    return true;
  }
}
