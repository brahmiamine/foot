import "reflect-metadata";

import { DataSource } from "typeorm";
import { Team } from "@/entities/Team";
import { TeamBranding } from "@/entities/TeamBranding";
import { Player } from "@/entities/Player";
import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Convocation } from "@/entities/Convocation";
import { Training } from "@/entities/Training";
import { TrainingInvitation } from "@/entities/TrainingInvitation";
import { PlayerStat } from "@/entities/PlayerStat";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Trip } from "@/entities/Trip";
import { TripParticipant } from "@/entities/TripParticipant";
import { Injury } from "@/entities/Injury";
import { PlayerAvailabilityDeclaration } from "@/entities/PlayerAvailabilityDeclaration";
import { PlayerConsent } from "@/entities/PlayerConsent";
import { PlayerAdministrativeRequest } from "@/entities/PlayerAdministrativeRequest";
import { PlayerContract } from "@/entities/PlayerContract";
import { PlayerRegistration } from "@/entities/PlayerRegistration";
import { MedicalEligibility } from "@/entities/MedicalEligibility";

/**
 * Connexion TypeORM vers la base "foot" partagée avec identity/match-operations/
 * arbinote/federation-hub/club-hub/seller-portal — voir club-hub/src/lib/database.ts
 * (même pattern). player-hub lit les données déjà gérées par club-hub/
 * federation-hub (`PlayerContract`/`PlayerRegistration`/`MedicalEligibility`
 * ci-dessous sont des sous-ensembles restreints en lecture seule, voir
 * PLAYER-003) et écrit uniquement ses propres lignes : réponses du joueur
 * connecté (Convocation.response, TrainingInvitation.response,
 * TripParticipant.transportOffer) et, depuis PLAYER-002/004/005, ses propres
 * déclarations de disponibilité, consentements et demandes administratives
 * (voir services/PlayerPortalService.ts).
 */
let dataSource: DataSource | null = null;
let initPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  if (!initPromise) {
    const newDataSource = new DataSource({
      type: "mariadb",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "foot",
      synchronize: false,
      logging: process.env.NODE_ENV === "development",
      entities: [
        Team,
        TeamBranding,
        Player,
        Match,
        FriendlyMatch,
        Convocation,
        Training,
        TrainingInvitation,
        PlayerStat,
        Card,
        Suspension,
        Fine,
        Trip,
        TripParticipant,
        Injury,
        PlayerAvailabilityDeclaration,
        PlayerConsent,
        PlayerAdministrativeRequest,
        PlayerContract,
        PlayerRegistration,
        MedicalEligibility,
      ],
      migrations: [],
      charset: "utf8mb4",
      timezone: "Z",
    });

    initPromise = newDataSource.initialize().then((ds) => {
      dataSource = ds;
      return ds;
    });
  }

  return initPromise;
}
