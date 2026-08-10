import { getDataSource } from "@/lib/database";
import { ContactInfo } from "@/entities/ContactInfo";

/** Service lecture seule pour la page /contact. */
export class PublicContactService {
  async getInfo(teamId: string): Promise<ContactInfo | null> {
    const ds = await getDataSource();
    return ds.getRepository(ContactInfo).findOne({ where: { teamId } });
  }
}
