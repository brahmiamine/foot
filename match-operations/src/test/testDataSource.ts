import "reflect-metadata";
import { DataSource } from "typeorm";
import { Card } from "@/entities/Card";
import { CardReason } from "@/entities/CardReason";
import { CompetitionMatchProtocol } from "@/entities/CompetitionMatchProtocol";
import { Federation } from "@/entities/Federation";
import { Goal } from "@/entities/Goal";
import { Injury } from "@/entities/Injury";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { MatchEventCorrection } from "@/entities/MatchEventCorrection";
import { MatchOfficialAssignment } from "@/entities/MatchOfficialAssignment";
import { MatchReopenLog } from "@/entities/MatchReopenLog";
import { MatchStaffAssignment, MatchStaffRead, CoachQualificationRead } from "@/entities/MatchStaffAssignment";
import { Player } from "@/entities/Player";
import { Sheet } from "@/entities/Sheet";
import { SheetAmendment } from "@/entities/SheetAmendment";
import { Signature } from "@/entities/Signature";
import { Substitution } from "@/entities/Substitution";
import { Team } from "@/entities/Team";
import { RefereeUnavailability } from "@/entities/RefereeUnavailability";
import { MatchLineup } from "@/entities/MatchLineup";
import { TeamMembership } from "@/entities/TeamMembership";
import { CompetitionRegistrationRead, EligibilityCheckWrite, MedicalEligibilityRead, PersonLicenseRead, PlayerContractRead, PlayerRegistrationRead, PlayerTransferRead, RegulatoryLegacyConfirmationRead, SeasonRegulation, SuspensionRead } from "@/entities/Eligibility";

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "better-sqlite3",
    database: ":memory:",
    dropSchema: true,
    synchronize: true,
    entities: [
      Card, CardReason, CompetitionMatchProtocol, Federation, Goal, Injury, Match, Matchday,
      MatchEventCorrection, MatchOfficialAssignment, MatchReopenLog, MatchStaffAssignment,
      MatchStaffRead, CoachQualificationRead, Player, Sheet, SheetAmendment, Signature, Substitution, Team,
      RefereeUnavailability, MatchLineup, TeamMembership, CompetitionRegistrationRead,
      EligibilityCheckWrite, MedicalEligibilityRead, PersonLicenseRead, PlayerContractRead,
      PlayerRegistrationRead, PlayerTransferRead, RegulatoryLegacyConfirmationRead,
      SeasonRegulation, SuspensionRead,
    ],
  });
  await dataSource.initialize();
  return dataSource;
}
