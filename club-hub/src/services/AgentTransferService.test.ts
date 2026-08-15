import { describe,expect,it,vi } from "vitest";
import type { DataSource } from "typeorm";
import { assertTransferRepresentation } from "./AgentService";

function source(agent:unknown,agreement:unknown):DataSource{
  return {getRepository:(entity:{name?:string})=>({findOne:vi.fn(async()=>entity.name==="FootballAgent"?agent:agreement)})} as unknown as DataSource;
}
const input={agentId:"agent",representationAgreementId:"agreement",playerId:"player",fromTeamId:"from",toTeamId:"to",effectiveDate:"2026-08-15"};

describe("transfer representation",()=>{
 it("rejects an inactive agent",async()=>{
  await expect(assertTransferRepresentation(source({status:"SUSPENDED",validUntil:"2027-01-01"},null),input)).rejects.toThrow(/n'est pas actif/);
 });
 it("rejects a mandate that does not cover the transfer",async()=>{
  await expect(assertTransferRepresentation(source({status:"ACTIVE",validUntil:"2027-01-01"},{id:"agreement",agentId:"agent",status:"ACTIVE",startDate:"2026-01-01",endDate:"2026-12-31",playerId:"other",clubId:"other"}),input)).rejects.toThrow(/ne concerne ni le joueur ni les clubs/);
 });
 it("accepts an active player mandate",async()=>{
  await expect(assertTransferRepresentation(source({status:"ACTIVE",validUntil:"2027-01-01"},{id:"agreement",agentId:"agent",status:"ACTIVE",startDate:"2026-01-01",endDate:"2026-12-31",playerId:"player",clubId:null}),input)).resolves.toBeUndefined();
 });
});
