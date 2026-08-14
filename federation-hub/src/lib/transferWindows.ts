import type { DataSource, EntityManager, SelectQueryBuilder } from "typeorm";
import { assertTransferWindowTransition, isTransferWindowOpen, type TransferWindowStatus, type TransferWindowType } from "../../../packages/regulatory-shared/src/transferWindow";
import { canAccessFederation, canAccessLeague, canAccessPlatform } from "./adminAuth";
import type { SsoUser } from "./ssoSession";
import { TransferWindow, TransferWindowHistory } from "./entities";
import { notify } from "./notificationClient";
import type { RegulatoryAudit } from "./competitionRegistrations";

function allowed(session:SsoUser,w:{federationId:string;leagueId?:string|null}){
  return canAccessPlatform(session)||canAccessFederation(session,w.federationId)||!!w.leagueId&&canAccessLeague(session,w.leagueId,w.federationId);
}
function scope(q:SelectQueryBuilder<TransferWindow>,s:SsoUser){
  if(canAccessPlatform(s))return;
  if(s.role==="FEDERATION_ADMIN"&&s.federationId)q.andWhere("window.federation_id=:f",{f:s.federationId});
  else if(s.role==="LEAGUE_ADMIN"&&s.leagueId)q.andWhere("window.league_id=:l",{l:s.leagueId});
  else q.andWhere("1=0");
}
async function log(manager:EntityManager,w:TransferWindow,a:RegulatoryAudit,action:string,from?:string|null,to?:string|null,reason?:string|null){
  const r=manager.getRepository(TransferWindowHistory);await r.save(r.create({windowId:w.id,action,fromStatus:from??null,toStatus:to??null,actorUserId:a.userId,actorRole:a.role,reason:reason??null,ipAddress:a.ipAddress??null,userAgent:a.userAgent??null}));
}
export async function listTransferWindows(ds:DataSource,s:SsoUser,seasonId?:string){
  const q=ds.getRepository(TransferWindow).createQueryBuilder("window").orderBy("window.opens_at","DESC");scope(q,s);if(seasonId)q.andWhere("window.season_id=:seasonId",{seasonId});return q.getMany();
}
export async function createTransferWindow(ds:DataSource,s:SsoUser,a:RegulatoryAudit,input:{federationId:string;leagueId?:string|null;seasonId:string;type:TransferWindowType;opensAt:string;closesAt:string;exceptionPolicy?:string|null}){
  if(!allowed(s,input))throw new Error("Forbidden");
  const opensAt=new Date(input.opensAt),closesAt=new Date(input.closesAt);if(Number.isNaN(+opensAt)||Number.isNaN(+closesAt)||closesAt<=opensAt)throw new Error("La fermeture doit être postérieure à l'ouverture");
  const saved=await ds.transaction(async m=>{const r=m.getRepository(TransferWindow);const w=await r.save(r.create({...input,leagueId:input.leagueId??null,opensAt,closesAt,status:"PLANNED",createdBy:a.userId}));await log(m,w,a,"CREATED");return w});
  return saved;
}
export async function transitionTransferWindow(ds:DataSource,s:SsoUser,a:RegulatoryAudit,id:string,target:TransferWindowStatus,reason?:string|null){
  const saved=await ds.transaction(async m=>{const r=m.getRepository(TransferWindow);const w=await r.createQueryBuilder("window").setLock("pessimistic_write").where("window.id=:id",{id}).getOne();if(!w)throw new Error("Fenêtre introuvable");if(!allowed(s,w))throw new Error("Forbidden");assertTransferWindowTransition(w.status,target);const from=w.status;w.status=target;await r.save(w);await log(m,w,a,`STATUS_${target}`,from,target,reason);return w});
  if(target==="OPEN")await notify({eventId:`transfer-window:${saved.id}:OPEN`,type:"TRANSFER_WINDOW_OPENED",target:{type:"ROLE",role:"CLUB_ADMIN"},category:"REGULATORY",title:"Fenêtre de transfert ouverte",body:`La fenêtre ${saved.type} est ouverte.`,data:{windowId:saved.id,seasonId:saved.seasonId,closesAt:saved.closesAt.toISOString()}});
  return Object.assign(saved,{currentlyOpen:isTransferWindowOpen(saved)});
}
