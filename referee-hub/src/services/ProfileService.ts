import { Assignment } from "@/entities/Assignment";
import { Referee } from "@/entities/Referee";
import { User } from "@/entities/User";
import { getDataSource } from "@/lib/db";
import { IsNull, Not } from "typeorm";

export interface RefereeProfile {
  user: User;
  referee: Referee | null;
}

export class ProfileService {
  async getMine(userId: string): Promise<RefereeProfile | null> {
    const dataSource = await getDataSource();
    const user = await dataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) return null;

    const linkedAssignment = await dataSource.getRepository(Assignment).findOne({
      where: { userId, refereeId: Not(IsNull()) },
      relations: ["referee"],
      order: { assignedAt: "DESC" },
    });
    return { user, referee: linkedAssignment?.referee ?? null };
  }
}
