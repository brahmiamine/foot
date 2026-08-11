import { getDataSource } from "@/lib/database";
import { PlayerApplication, ApplicationStatus } from "@/entities/PlayerApplication";

interface CreatePlayerApplicationData {
  childLastName: string;
  childFirstName: string;
  birthDate: string;
  category: string;
  position?: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  message?: string | null;
  documentUrl?: string | null;
}

/**
 * Service pour les candidatures "Inscrire mon enfant" (formulaire public
 * /inscription, traitement dans /admin/academy/applications).
 */
export class PlayerApplicationService {
  async findAll(teamId: string, status?: ApplicationStatus): Promise<PlayerApplication[]> {
    const ds = await getDataSource();
    return ds.getRepository(PlayerApplication).find({
      where: status ? { teamId, status } : { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number, teamId: string): Promise<PlayerApplication | null> {
    const ds = await getDataSource();
    return ds.getRepository(PlayerApplication).findOne({ where: { id, teamId } });
  }

  /** Soumission publique, sans authentification. */
  async create(teamId: string, data: CreatePlayerApplicationData): Promise<PlayerApplication> {
    const ds = await getDataSource();
    const repository = ds.getRepository(PlayerApplication);
    return repository.save(repository.create({ ...data, teamId, status: "NEW" }));
  }

  async updateStatus(id: number, teamId: string, status: ApplicationStatus, adminNotes?: string | null): Promise<PlayerApplication> {
    const ds = await getDataSource();
    const repository = ds.getRepository(PlayerApplication);
    const application = await repository.findOne({ where: { id, teamId } });
    if (!application) throw new Error("Candidature introuvable");
    application.status = status;
    if (adminNotes !== undefined) application.adminNotes = adminNotes;
    return repository.save(application);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const ds = await getDataSource();
    const repository = ds.getRepository(PlayerApplication);
    const application = await repository.findOne({ where: { id, teamId } });
    if (!application) throw new Error("Candidature introuvable");
    await repository.remove(application);
    return true;
  }
}
