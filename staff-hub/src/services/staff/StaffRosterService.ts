import { In } from "typeorm";
import { Player } from "@/entities/Player";
import { Staff } from "@/entities/Staff";
import { Suspension } from "@/entities/Suspension";
import { Injury } from "@/entities/Injury";
import { categoryWhere, StaffServiceBase, type CategoryScope } from "./StaffServiceBase";

export class StaffRosterService extends StaffServiceBase {
  async getRoster(teamId: string, categories: CategoryScope): Promise<Player[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: categoryWhere(categories) };
    return ds.getRepository(Player).find({ where, order: { number: "ASC" } });
  }

  async getStaffList(teamId: string, categories: CategoryScope): Promise<Staff[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: categoryWhere(categories) };
    return ds.getRepository(Staff).find({ where, order: { lastNameFr: "ASC" } });
  }

  async getAvailability(playerIds: string[]): Promise<Map<string, "AVAILABLE" | "INJURED" | "SUSPENDED">> {
    const ds = await this.ds();
    const map = new Map<string, "AVAILABLE" | "INJURED" | "SUSPENDED">();
    if (playerIds.length === 0) return map;

    const injuries = await ds.getRepository(Injury).find({
      where: [
        { playerId: In(playerIds), status: "ONGOING" },
        { playerId: In(playerIds), status: "RECOVERING" },
      ],
    });
    const suspensions = await ds.getRepository(Suspension).find({
      where: { playerId: In(playerIds), status: "ACTIVE" },
    });

    for (const id of playerIds) map.set(id, "AVAILABLE");
    for (const suspension of suspensions) {
      if (suspension.matchesPurged < suspension.matchesCount) {
        map.set(suspension.playerId, "SUSPENDED");
      }
    }
    for (const injury of injuries) map.set(injury.playerId, "INJURED");

    return map;
  }
}
