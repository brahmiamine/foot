import type { DataSource, EntityManager, SelectQueryBuilder } from "typeorm";
import { assertCompetitionRegistrationApproval, assertCompetitionRegistrationTransition, CompetitionRegistrationWorkflowError, type CompetitionRegistrationStatus } from "../../../packages/regulatory-shared/src/competitionRegistration";
import { canAccessFederation, canAccessLeague, canAccessPlatform } from "./adminAuth";
import type { SsoUser } from "./ssoSession";
import { ClubLicenseApplication, CompetitionRegistration, CompetitionRegistrationHistory, FinancialCompliance, Saison, StadiumInspection } from "./entities";
import { notify } from "./notificationClient";
import { hasActiveCompetitionBan } from "./clubSanctions";
import { getRegulatoryPayment } from "./paymentApiClient";

export interface RegulatoryAudit { userId: string; role: string; ipAddress?: string|null; userAgent?: string|null }
export class CompetitionRegistrationAuthorizationError extends Error { constructor(){super("Forbidden");this.name="CompetitionRegistrationAuthorizationError"} }

function canAccess(session:SsoUser, item:CompetitionRegistration):boolean {
  return canAccessPlatform(session) || canAccessFederation(session,item.federationId) ||
    (!!item.leagueId && canAccessLeague(session,item.leagueId,item.federationId));
}
function applyScope(q:SelectQueryBuilder<CompetitionRegistration>,session:SsoUser){
  if(canAccessPlatform(session)) return;
  if(session.role==="FEDERATION_ADMIN"&&session.federationId) q.andWhere("entry.federation_id = :f",{f:session.federationId});
  else if(session.role==="LEAGUE_ADMIN"&&session.leagueId) q.andWhere("entry.league_id = :l",{l:session.leagueId});
  else q.andWhere("1=0");
}
async function history(manager:EntityManager,item:CompetitionRegistration,audit:RegulatoryAudit,from:string,to:string,reason?:string|null){
  const repo=manager.getRepository(CompetitionRegistrationHistory);
  await repo.save(repo.create({registrationId:item.id,action:`STATUS_${to}`,fromStatus:from,toStatus:to,actorUserId:audit.userId,actorRole:audit.role,reason:reason??null,beforeValue:{status:from},afterValue:{status:to},ipAddress:audit.ipAddress??null,userAgent:audit.userAgent??null}));
}

async function assertRealApprovalPrerequisites(manager:EntityManager,item:CompetitionRegistration,season:Saison):Promise<void>{
  const now=new Date();
  const requiredFee=Number(item.feesAmount??season.competitionEntryFee??0);

  if(season.requiresStadiumApproval){
    if(!item.stadiumApprovalId) throw new CompetitionRegistrationWorkflowError("Une homologation de stade est obligatoire");
    const inspection=await manager.getRepository(StadiumInspection).findOne({where:{id:item.stadiumApprovalId,clubId:item.clubId,seasonId:item.seasonId}});
    const approved=inspection&&["APPROVED","APPROVED_WITH_RESTRICTIONS"].includes(inspection.status)&&(!inspection.expiresAt||new Date(inspection.expiresAt)>=now);
    if(!approved) throw new CompetitionRegistrationWorkflowError("L'homologation de stade référencée n'est pas approuvée, appartient à un autre périmètre ou est expirée");
  }

  if(season.requiresFinancialCompliance){
    if(!item.financialComplianceId) throw new CompetitionRegistrationWorkflowError("La conformité financière est obligatoire");
    const compliance=await manager.getRepository(FinancialCompliance).findOne({where:{id:item.financialComplianceId,clubId:item.clubId,seasonId:item.seasonId,status:"COMPLIANT"}});
    if(!compliance) throw new CompetitionRegistrationWorkflowError("Le dossier de conformité financière référencé n'est pas COMPLIANT pour ce club et cette saison");
  }

  if(requiredFee>0){
    if(!item.feesPaymentId) throw new CompetitionRegistrationWorkflowError("Les droits d'engagement ne sont pas réglés");
    const payment=await getRegulatoryPayment(item.feesPaymentId);
    if(!payment||payment.status!=="PAID") throw new CompetitionRegistrationWorkflowError("Le paiement des droits d'engagement n'est pas confirmé");
    if(payment.currency!=="TND") throw new CompetitionRegistrationWorkflowError("La devise du paiement des droits d'engagement est invalide");
    if(Number(payment.amount)+Number.EPSILON<requiredFee) throw new CompetitionRegistrationWorkflowError("Le montant payé est inférieur aux droits d'engagement exigés");
  }
}

export async function listCompetitionRegistrations(ds:DataSource,session:SsoUser,filters:{seasonId?:string;clubId?:string;status?:string}={}){
  const q=ds.getRepository(CompetitionRegistration).createQueryBuilder("entry").orderBy("entry.updated_at","DESC");
  applyScope(q,session);
  if(filters.seasonId)q.andWhere("entry.season_id=:seasonId",{seasonId:filters.seasonId});
  if(filters.clubId)q.andWhere("entry.club_id=:clubId",{clubId:filters.clubId});
  if(filters.status)q.andWhere("entry.status=:status",{status:filters.status});
  return q.getMany();
}
export async function transitionCompetitionRegistration(ds:DataSource,session:SsoUser,audit:RegulatoryAudit,id:string,target:CompetitionRegistrationStatus,reason?:string|null){
  if(["CHANGES_REQUESTED","REJECTED","SUSPENDED"].includes(target)&&!reason?.trim()) throw new CompetitionRegistrationWorkflowError("Un motif est obligatoire");
  const saved=await ds.transaction(async manager=>{
    const repo=manager.getRepository(CompetitionRegistration);
    const item=await repo.createQueryBuilder("entry").setLock("pessimistic_write").where("entry.id=:id",{id}).getOne();
    if(!item)throw new CompetitionRegistrationWorkflowError("Engagement introuvable");
    if(!canAccess(session,item))throw new CompetitionRegistrationAuthorizationError();
    assertCompetitionRegistrationTransition(item.status,target);
    if(target==="APPROVED"){
      const [license,season,ban]=await Promise.all([
        manager.getRepository(ClubLicenseApplication).findOne({where:{id:item.clubLicenseId,clubId:item.clubId,seasonId:item.seasonId,status:"APPROVED"}}),
        manager.getRepository(Saison).findOne({where:{id:item.seasonId}}),
        hasActiveCompetitionBan(manager,item.clubId,item.seasonId),
      ]);
      if(!season)throw new CompetitionRegistrationWorkflowError("Compétition-saison introuvable");
      assertCompetitionRegistrationApproval({clubLicenseApproved:!!license,clubLicenseExpiresAt:license?.expiresAt,documentsComplete:item.documentsComplete,participationBlocked:!!ban,stadiumRequired:season.requiresStadiumApproval,stadiumApprovalId:item.stadiumApprovalId,financialComplianceRequired:season.requiresFinancialCompliance,financialComplianceId:item.financialComplianceId,feesAmount:item.feesAmount??season.competitionEntryFee,feesPaymentId:item.feesPaymentId});
      await assertRealApprovalPrerequisites(manager,item,season);
    }
    const from=item.status; item.status=target;
    item.rejectionReason=["CHANGES_REQUESTED","REJECTED","SUSPENDED"].includes(target)?reason??null:null;
    if(target==="APPROVED"){item.approvedAt=new Date();item.approvedBy=audit.userId}
    await repo.save(item); await history(manager,item,audit,from,target,reason); return item;
  });
  const event:Partial<Record<CompetitionRegistrationStatus,string>>={CHANGES_REQUESTED:"COMPETITION_ENTRY_CHANGES_REQUESTED",APPROVED:"COMPETITION_ENTRY_APPROVED",REJECTED:"COMPETITION_ENTRY_REJECTED",SUSPENDED:"COMPETITION_ENTRY_SUSPENDED"};
  if(event[target])await notify({eventId:`competition-entry:${saved.id}:${target}`,type:event[target]!,target:{type:"TEAM",teamId:saved.clubId},teamId:saved.clubId,category:"REGULATORY",title:"Engagement compétition",body:`Le statut de votre engagement est ${target}.`,data:{registrationId:saved.id,seasonId:saved.seasonId,status:target}});
  return saved;
}
