import "reflect-metadata";
import { DataSource } from "typeorm";
import { Assignment } from "@/entities/Assignment";
import { AssignmentResponse } from "@/entities/AssignmentResponse";
import { ReplacementRequest } from "@/entities/ReplacementRequest";
import { League } from "@/entities/League";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { Referee } from "@/entities/Referee";
import { Season } from "@/entities/Season";
import { Team } from "@/entities/Team";
import { User } from "@/entities/User";
import { RefereeMatchReport } from "@/entities/RefereeMatchReport";
import { RefereeUnavailability } from "@/entities/RefereeUnavailability";
import { RefereeUnavailabilityPolicy } from "@/entities/RefereeUnavailabilityPolicy";
import { RefereeReportPolicy } from "@/entities/RefereeReportPolicy";
import { RefereeConflictDeclaration } from "@/entities/RefereeConflictDeclaration";
import { RefereeConfigurationAudit } from "@/entities/RefereeConfigurationAudit";
import { RefereeReportSlaAlert } from "@/entities/RefereeReportSlaAlert";

let dataSource: DataSource | null = null;
let initPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource?.isInitialized) return dataSource;

  if (!initPromise) {
    const nextDataSource = new DataSource({
      type: "mariadb",
      host: process.env.DB_HOST || "localhost",
      port: Number.parseInt(process.env.DB_PORT || "3306", 10),
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "foot",
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
      charset: "utf8mb4",
      timezone: "Z",
      entities: [
        Assignment,
        AssignmentResponse,
        ReplacementRequest,
        League,
        Match,
        Matchday,
        Referee,
        RefereeMatchReport,
        RefereeUnavailability,
        RefereeUnavailabilityPolicy,
        RefereeReportPolicy,
        RefereeConflictDeclaration,
        RefereeConfigurationAudit,
        RefereeReportSlaAlert,
        Season,
        Team,
        User,
      ],
    });
    initPromise = nextDataSource.initialize().then((initialized) => {
      dataSource = initialized;
      return initialized;
    });
  }

  return initPromise;
}