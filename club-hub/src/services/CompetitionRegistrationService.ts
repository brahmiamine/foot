import { getDataSource } from "@/lib/database";
import { ClubLicenseApplication } from "@/entities/ClubLicense";
import { Team } from "@/entities/Team";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { CompetitionRegistration, CompetitionRegistrationHistory } from "@/entities/Regulatory";
import { notify } from "@/lib/notificationClient";
import { assertCompetitionRegistrationTransition } from "../../../packages/regulatory-shared/src/competitionRegistration";

export async function listCompetitionEntriesForClub(clubId:string){
  const ds=await getDataSource();return ds.getRepository(CompetitionRegistration).find({where:{clubId},order:{updatedAt:"DESC"}});
}
export async function createCompetitionEntry(input:{clubId:string;seasonId:string;clubLicenseId:string;documentsComplete:boolean;userId:string;role:string;ipAddress?:string|null;userAgent?:string|null}){
  const ds=await getDataSource();
  const [team,affiliation,license,seasonRows]=await Promise.all([
    ds.getRepository(Team).findOne({where:{id:input.clubId}}),
    ds.getRepository(TeamAffiliation).findOne({where:{teamId:input.clubId,status:"ACTIVE"}}),
    ds.getRepository(ClubLicenseApplication).findOne({where:{id:input.clubLicenseId,clubId:input.clubId,seasonId:input.seasonId,status:"APPROVED"}}),
    ds.query("SELECT id, competition_entry_fee FROM saisons WHERE id=? LIMIT 1",[input.seasonId]),
  ]);
  if(!team||!affiliation||!license||!seasonRows.length)throw new Error("Club, affiliation, saison ou licence club invalide");
  return ds.transaction(async m=>{const r=m.getRepository(CompetitionRegistration);const item=await r.save(r.create({seasonId:input.seasonId,clubId:input.clubId,teamId:input.clubId,federationId:affiliation.federationId,leagueId:affiliation.leagueId??null,category:team.ageCategory,clubLicenseId:license.id,documentsComplete:input.documentsComplete,feesAmount:seasonRows[0].competition_entry_fee??null,status:"DRAFT"}));const h=m.getRepository(CompetitionRegistrationHistory);await h.save(h.create({registrationId:item.id,action:"CREATED",actorUserId:input.userId,actorRole:input.role,afterValue:{status:"DRAFT"},ipAddress:input.ipAddress??null,userAgent:input.userAgent??null}));return item});
}
export async function updateCompetitionEntry(clubId:string,id:string,input:{documentsComplete?:boolean;stadiumApprovalId?:string|null;financialComplianceId?:string|null;feesPaymentId?:string|null}){
  const ds=await getDataSource(),r=ds.getRepository(CompetitionRegistration),item=await r.findOne({where:{id,clubId}});if(!item)throw new Error("Engagement introuvable");if(!["DRAFT","CHANGES_REQUESTED"].includes(item.status))throw new Error("Engagement non modifiable");Object.assign(item,input);return r.save(item);
}
export async function submitCompetitionEntry(clubId:string,id:string,a:{userId:string;role:string;ipAddress?:string|null;userAgent?:string|null}){
  const ds=await getDataSource();const saved=await ds.transaction(async m=>{const r=m.getRepository(CompetitionRegistration);const item=await r.createQueryBuilder("entry").setLock("pessimistic_write").where("entry.id=:id AND entry.club_id=:clubId",{id,clubId}).getOne();if(!item)throw new Error("Engagement introuvable");assertCompetitionRegistrationTransition(item.status,"SUBMITTED");if(!item.documentsComplete)throw new Error("Le dossier doit être complet avant soumission");const from=item.status;item.status="SUBMITTED";item.submittedAt=new Date();await r.save(item);const h=m.getRepository(CompetitionRegistrationHistory);await h.save(h.create({registrationId:id,action:"SUBMITTED",fromStatus:from,toStatus:"SUBMITTED",actorUserId:a.userId,actorRole:a.role,beforeValue:{status:from},afterValue:{status:"SUBMITTED"},ipAddress:a.ipAddress??null,userAgent:a.userAgent??null}));return item});await notify({eventId:`competition-entry:${id}:SUBMITTED`,type:"COMPETITION_ENTRY_SUBMITTED",target:{type:"ROLE",role:"FEDERATION_ADMIN"},teamId:clubId,category:"REGULATORY",title:"Nouvel engagement",body:"Un club a soumis un engagement à une compétition.",data:{registrationId:id,seasonId:saved.seasonId,clubId}});return saved;
}
