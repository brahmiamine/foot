import { getDataSource } from "@/lib/database";
import { ContactInfo } from "@/entities/ContactInfo";
import { ContactMessage, ContactDepartment, ContactMessageStatus } from "@/entities/ContactMessage";

interface ContactInfoData {
  addressFr?: string | null;
  addressAr?: string | null;
  phone?: string | null;
  email?: string | null;
  openingHoursFr?: string | null;
  openingHoursAr?: string | null;
  mapEmbedUrl?: string | null;
  adminPhone?: string | null;
  adminEmail?: string | null;
  sportPhone?: string | null;
  sportEmail?: string | null;
  academyPhone?: string | null;
  academyEmail?: string | null;
  partnershipPhone?: string | null;
  partnershipEmail?: string | null;
}

interface CreateContactMessageData {
  name: string;
  email: string;
  subject: string;
  department: ContactDepartment;
  message: string;
}

/** Service pour la page /contact : coordonnées du club (singleton) + messages reçus. */
export class ContactService {
  async getInfo(teamId: string): Promise<ContactInfo | null> {
    const ds = await getDataSource();
    return ds.getRepository(ContactInfo).findOne({ where: { teamId } });
  }

  async saveInfo(teamId: string, data: ContactInfoData): Promise<ContactInfo> {
    const ds = await getDataSource();
    const repository = ds.getRepository(ContactInfo);
    const existing = await repository.findOne({ where: { teamId } });
    if (existing) {
      Object.assign(existing, data);
      return repository.save(existing);
    }
    return repository.save(repository.create({ ...data, teamId }));
  }

  async findAllMessages(teamId: string, status?: ContactMessageStatus): Promise<ContactMessage[]> {
    const ds = await getDataSource();
    return ds.getRepository(ContactMessage).find({
      where: status ? { teamId, status } : { teamId },
      order: { createdAt: "DESC" },
    });
  }

  /** Soumission publique, sans authentification. */
  async createMessage(teamId: string, data: CreateContactMessageData): Promise<ContactMessage> {
    const ds = await getDataSource();
    const repository = ds.getRepository(ContactMessage);
    return repository.save(repository.create({ ...data, teamId, status: "NEW" }));
  }

  async updateMessageStatus(id: number, teamId: string, status: ContactMessageStatus): Promise<ContactMessage> {
    const ds = await getDataSource();
    const repository = ds.getRepository(ContactMessage);
    const contactMessage = await repository.findOne({ where: { id, teamId } });
    if (!contactMessage) throw new Error("Message introuvable");
    contactMessage.status = status;
    return repository.save(contactMessage);
  }

  async deleteMessage(id: number, teamId: string): Promise<boolean> {
    const ds = await getDataSource();
    const repository = ds.getRepository(ContactMessage);
    const contactMessage = await repository.findOne({ where: { id, teamId } });
    if (!contactMessage) throw new Error("Message introuvable");
    await repository.remove(contactMessage);
    return true;
  }
}
