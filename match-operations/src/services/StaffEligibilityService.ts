import { getDataSource } from "@/lib/db";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { SeasonRegulation } from "@/entities/Eligibility";
import { CoachQualificationRead, MatchStaffAssignment } from "@/entities/MatchStaffAssignment";
import { meetsMinimumQualification } from "../../../packages/regulatory-shared/src/coachQualification";

export class StaffEligibilityError extends Error {
  constructor(public readonly failures: Array<{ teamId: string; reason: string }>) {
    super(failures.map(item => `${item.teamId}: ${item.reason}`).join(" | "));
    this.name = "StaffEligibilityError";
  }
}

export class StaffEligibilityService {
  async assertHeadCoachesEligible(matchId: string): Promise<void> {
    const ds = await getDataSource();
    const match = await ds.getRepository(Match).findOne({ where: { id: matchId } });
    if (!match) throw new StaffEligibilityError([{ teamId: "MATCH", reason: "MATCH_NOT_FOUND" }]);
    const matchday = await ds.getRepository(Matchday).findOne({ where: { id: match.journeeId } });
    if (!matchday?.seasonId) throw new StaffEligibilityError([{ teamId: "MATCH", reason: "SEASON_NOT_FOUND" }]);
    const season = await ds.getRepository(SeasonRegulation).findOne({ where: { id: matchday.seasonId } });
    const minimum = season?.minimumHeadCoachQualification;
    if (!minimum) return;

    const failures: Array<{ teamId: string; reason: string }> = [];
    for (const teamId of [match.equipeHome, match.equipeAway]) {
      const assignment = await ds.getRepository(MatchStaffAssignment).findOne({ where: { matchId, teamId, role: "HEAD_COACH" } });
      if (!assignment) {
        failures.push({ teamId, reason: "HEAD_COACH_NOT_ASSIGNED" });
        continue;
      }
      const qualifications = await ds.getRepository(CoachQualificationRead)
        .createQueryBuilder("qualification")
        .where("qualification.staffId=:staffId AND qualification.clubId=:teamId AND qualification.status='VALID'", { staffId: assignment.staffId, teamId })
        .andWhere("(qualification.expiresAt IS NULL OR qualification.expiresAt>=:matchDate)", { matchDate: match.date ?? new Date() })
        .getMany();
      const valid = qualifications.some(item => meetsMinimumQualification(item.qualificationType, minimum));
      if (!valid) failures.push({ teamId, reason: `HEAD_COACH_QUALIFICATION_REQUIRED:${minimum}` });
    }
    if (failures.length) throw new StaffEligibilityError(failures);
  }
}
