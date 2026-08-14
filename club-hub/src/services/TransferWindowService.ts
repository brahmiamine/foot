import type { DataSource } from "typeorm";
import { isTransferWindowOpen } from "../../../packages/regulatory-shared/src/transferWindow";
import { TransferWindow } from "@/entities/Regulatory";
import { TeamAffiliation } from "@/entities/TeamAffiliation";

export async function findOpenTransferWindow(ds:DataSource,input:{teamId:string;seasonId:string;at?:Date}):Promise<TransferWindow|null>{
  const affiliation=await ds.getRepository(TeamAffiliation).findOne({where:{teamId:input.teamId,status:"ACTIVE"}});if(!affiliation)return null;
  const windows=await ds.getRepository(TransferWindow).createQueryBuilder("window")
    .where("window.season_id=:seasonId",{seasonId:input.seasonId})
    .andWhere("window.federation_id=:federationId",{federationId:affiliation.federationId})
    .andWhere("(window.league_id IS NULL OR window.league_id=:leagueId)",{leagueId:affiliation.leagueId??""})
    .andWhere("window.status='OPEN'").orderBy("window.league_id","DESC").getMany();
  return windows.find(w=>isTransferWindowOpen(w,input.at??new Date()))??null;
}
