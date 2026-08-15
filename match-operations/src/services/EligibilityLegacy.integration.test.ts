import { describe,expect,it,vi } from "vitest";
import { EligibilityService } from "./EligibilityService";

const state=vi.hoisted(()=>({suspension:null as unknown}));
vi.mock("@/lib/db",()=>({getDataSource:async()=>fakeDataSource()}));

function chain(value:unknown){const builder={where:()=>builder,andWhere:()=>builder,getOne:async()=>value};return builder}
function fakeDataSource(){
 const match={id:"m1",journeeId:"j1",equipeHome:"club",equipeAway:"away",date:new Date("2026-08-15")};
 return {getRepository:(entity:{name:string})=>{
  const name=entity.name;
  if(name==="Match")return{findOne:vi.fn(async()=>match)};
  if(name==="Matchday")return{findOne:vi.fn(async()=>({seasonId:"s1"}))};
  if(name==="TeamMembership")return{createQueryBuilder:()=>chain({id:"membership"})};
  if(name==="PersonLicenseRead")return{createQueryBuilder:()=>chain(null)};
  if(name==="PlayerRegistrationRead")return{findOne:vi.fn(async()=>null)};
  if(name==="SeasonRegulation")return{findOne:vi.fn(async()=>({requiresPlayerContract:false,requiresMedicalClearance:false}))};
  if(name==="CompetitionRegistrationRead")return{findOne:vi.fn(async()=>null)};
  if(name==="Player")return{findOne:vi.fn(async()=>({id:"p1",birthDate:"1995-01-01"}))};
  if(name==="Team")return{findOne:vi.fn(async()=>({id:"club",ageCategory:"SENIOR"}))};
  if(name==="SuspensionRead")return{createQueryBuilder:()=>chain(state.suspension)};
  if(name==="PlayerTransferRead")return{createQueryBuilder:()=>chain(null)};
  if(name==="MedicalEligibilityRead")return{createQueryBuilder:()=>chain(null)};
  if(name==="RegulatoryLegacyConfirmationRead")return{createQueryBuilder:()=>chain({source:"LEGACY_BACKFILL"})};
  if(name==="EligibilityCheckWrite")return{create:(v:unknown)=>v,save:vi.fn(async(v:unknown)=>v)};
  throw new Error(`unexpected repository ${name}`);
 }};
}

describe("legacy regulatory confirmation",()=>{
 it("bridges missing administrative records during the historical transition",async()=>{
  state.suspension=null;
  const result=await new EligibilityService().checkPlayerEligibility({playerId:"p1",clubId:"club",matchId:"m1"});
  expect(result.eligible).toBe(true);
  expect(result.blockingReasons).not.toContain("NO_ACTIVE_LICENSE");
  expect(result.warnings).toContain("LEGACY_REGULATORY_CONFIRMATION:LEGACY_BACKFILL");
 });
 it("never bypasses an active sporting suspension",async()=>{
  state.suspension={id:"suspension"};
  const result=await new EligibilityService().checkPlayerEligibility({playerId:"p1",clubId:"club",matchId:"m1"});
  expect(result.eligible).toBe(false);
  expect(result.blockingReasons).toContain("ACTIVE_SUSPENSION");
 });
});
