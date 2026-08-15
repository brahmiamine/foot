import { getDataSource } from "@/lib/db";
import { CompetitionRegistrationRead, EligibilityCheckWrite, MedicalEligibilityRead, PersonLicenseRead, PlayerContractRead, PlayerRegistrationRead, PlayerTransferRead, RegulatoryLegacyConfirmationRead, SeasonRegulation, SuspensionRead } from "@/entities/Eligibility";
import { Match } from "@/entities/Match";
import { MatchLineup } from "@/entities/MatchLineup";
import { Matchday } from "@/entities/Matchday";
import { Player } from "@/entities/Player";
import { Team } from "@/entities/Team";
import { TeamMembership } from "@/entities/TeamMembership";
import { eligibilityResult, fitsAgeCategory } from "../../../packages/regulatory-shared/src/eligibility";
import type {
  EligibilityBlockingReason,
  EligibilityCheckRequest,
  EligibilityContext,
  EligibilityResult,
  EligibilityServicePort,
} from "../../../packages/domain-contracts/src/eligibility";

export type { EligibilityContext } from "../../../packages/domain-contracts/src/eligibility";

export class LineupEligibilityError extends Error {
  constructor(public readonly failures:Array<{playerId:string;reasons:string[]}>){super(failures.map(f=>`${f.playerId}: ${f.reasons.join(", ")}`).join(" | "));this.name="LineupEligibilityError"}
}
export class EligibilityService implements EligibilityServicePort {
  async checkPlayerEligibility(input:EligibilityCheckRequest,context:EligibilityContext={}):Promise<EligibilityResult>{
    const ds=await getDataSource();
    const match=await ds.getRepository(Match).findOne({where:{id:input.matchId}});
    if(!match)throw new Error("Match introuvable");
    const matchDate=match.date??new Date();
    const matchday=await ds.getRepository(Matchday).findOne({where:{id:match.journeeId}});
    const seasonId=input.seasonId??matchday?.seasonId;if(!seasonId)throw new Error("Saison du match introuvable");
    const reasons:EligibilityBlockingReason[]=[];
    if(![match.equipeHome,match.equipeAway].includes(input.clubId))reasons.push("NOT_MATCH_TEAM");
    const [membership,license,registration,season,entry,player,team,suspension,transfer,medical,legacy]=await Promise.all([
      ds.getRepository(TeamMembership).createQueryBuilder("m").where("m.playerId=:p AND m.teamId=:c",{p:input.playerId,c:input.clubId}).andWhere("m.status IN ('ACTIVE','ENDED')").andWhere("m.startDate<=:d",{d:matchDate}).andWhere("(m.endDate IS NULL OR m.endDate>=:d)",{d:matchDate}).getOne(),
      ds.getRepository(PersonLicenseRead).createQueryBuilder("l").where("l.personReferenceId=:p AND l.clubId=:c AND l.seasonId=:s AND l.personType='PLAYER' AND l.status='APPROVED'",{p:input.playerId,c:input.clubId,s:seasonId}).andWhere("(l.expiresAt IS NULL OR l.expiresAt>=:d)",{d:matchDate}).getOne(),
      ds.getRepository(PlayerRegistrationRead).findOne({where:{playerId:input.playerId,clubId:input.clubId,seasonId}}),
      ds.getRepository(SeasonRegulation).findOne({where:{id:seasonId}}),
      ds.getRepository(CompetitionRegistrationRead).findOne({where:{teamId:input.clubId,seasonId,status:"APPROVED"}}),
      ds.getRepository(Player).findOne({where:{id:input.playerId}}),
      ds.getRepository(Team).findOne({where:{id:input.clubId}}),
      ds.getRepository(SuspensionRead).createQueryBuilder("s").where("s.playerId=:p",{p:input.playerId}).andWhere("(s.teamId IS NULL OR s.teamId=:c)",{c:input.clubId}).andWhere("s.status='ACTIVE'").andWhere("s.matchesPurged < COALESCE(s.overrideMatchesCount,s.matchesCount)").getOne(),
      ds.getRepository(PlayerTransferRead).createQueryBuilder("t").where("t.playerId=:p",{p:input.playerId}).andWhere("t.fromTeamId=:c",{c:input.clubId}).andWhere("t.status IN ('PENDING','APPROVED')").andWhere("t.effectiveDate<=:d",{d:matchDate}).getOne(),
      ds.getRepository(MedicalEligibilityRead).createQueryBuilder("m").where("m.playerId=:p AND m.clubId=:c AND m.seasonId=:s AND m.status='FIT'",{p:input.playerId,c:input.clubId,s:seasonId}).andWhere("(m.expiresAt IS NULL OR m.expiresAt>=:d)",{d:matchDate}).getOne(),
      ds.getRepository(RegulatoryLegacyConfirmationRead).createQueryBuilder("legacy").where("legacy.playerId=:p AND legacy.clubId=:c AND legacy.seasonId=:s",{p:input.playerId,c:input.clubId,s:seasonId}).andWhere("(legacy.expiresAt IS NULL OR legacy.expiresAt>=:d)",{d:matchDate}).getOne(),
    ]);
    const legacyAdministrativeFallback=!!legacy;
    if(!membership)reasons.push("NO_ACTIVE_MEMBERSHIP");
    if(!license&&!legacyAdministrativeFallback)reasons.push("NO_ACTIVE_LICENSE");
    if((!registration||registration.status!=="APPROVED"||registration.eligibilityStatus!=="ELIGIBLE")&&!legacyAdministrativeFallback)reasons.push("REGISTRATION_NOT_APPROVED");
    if(!entry&&!legacyAdministrativeFallback)reasons.push("CLUB_NOT_REGISTERED");
    if(season?.requiresPlayerContract){
      const contract=await ds.getRepository(PlayerContractRead).createQueryBuilder("c").where("c.playerId=:p AND c.clubId=:club AND c.seasonId=:s",{p:input.playerId,club:input.clubId,s:seasonId}).andWhere("c.status='SIGNED' AND c.federationStatus='APPROVED'").andWhere("c.startDate<=:d AND c.endDate>=:d",{d:matchDate}).getOne();
      if(!contract&&!legacyAdministrativeFallback)reasons.push("CONTRACT_NOT_HOMOLOGATED");
    }
    if(suspension)reasons.push("ACTIVE_SUSPENSION");
    if(transfer)reasons.push("TRANSFER_PENDING_OR_EFFECTIVE");
    if(season?.requiresMedicalClearance&&!medical&&!legacyAdministrativeFallback)reasons.push("MEDICAL_CLEARANCE_REQUIRED");
    if(player&&team&&!fitsAgeCategory(team.ageCategory,player.birthDate,matchDate))reasons.push("AGE_CATEGORY_MISMATCH");
    const warnings:string[]=[];
    if(!player?.birthDate)warnings.push("DATE_OF_BIRTH_MISSING");
    if(legacyAdministrativeFallback)warnings.push(`LEGACY_REGULATORY_CONFIRMATION:${legacy.source}`);
    const result=eligibilityResult(reasons,warnings);
    const r=ds.getRepository(EligibilityCheckWrite);await r.save(r.create({playerId:input.playerId,clubId:input.clubId,matchId:input.matchId,seasonId,eligible:result.eligible,blockingReasons:result.blockingReasons,warnings:result.warnings,actorUserId:context.actorUserId??null,actorRole:context.actorRole??"MATCH_OFFICIAL",ipAddress:context.ipAddress??null,userAgent:context.userAgent??null}));
    return result;
  }
  async checkLineup(matchId:string,context:EligibilityContext={}){
    const ds=await getDataSource();const lineups=await ds.getRepository(MatchLineup).find({where:{matchId}});
    if(!lineups.length)throw new LineupEligibilityError([{playerId:"LINEUP",reasons:["EMPTY_LINEUP"]}]);
    const results=await Promise.all(lineups.map(async l=>({playerId:l.playerId,teamId:l.teamId,result:await this.checkPlayerEligibility({playerId:l.playerId,clubId:l.teamId,matchId},context)})));
    return results;
  }
  async assertLineupEligible(matchId:string,context:EligibilityContext={}){
    const results=await this.checkLineup(matchId,context);const failures=results.filter(x=>!x.result.eligible).map(x=>({playerId:x.playerId,reasons:x.result.blockingReasons}));
    if(failures.length)throw new LineupEligibilityError(failures);return results;
  }
}
