import { describe,expect,it,vi } from "vitest";
import { StaffEligibilityError,StaffEligibilityService } from "./StaffEligibilityService";

const state=vi.hoisted(()=>({ds:null as unknown}));
vi.mock("@/lib/db",()=>({getDataSource:async()=>state.ds}));

function dataSource(levels:Record<string,string>){
 const match={id:"m1",journeeId:"j1",equipeHome:"home",equipeAway:"away",date:new Date("2026-08-15")};
 const assignments:Record<string,unknown>={home:{staffId:"1"},away:{staffId:"2"}};
 return {getRepository:(entity:{name:string})=>{
  if(entity.name==="Match")return{findOne:vi.fn(async()=>match)};
  if(entity.name==="Matchday")return{findOne:vi.fn(async()=>({seasonId:"s1"}))};
  if(entity.name==="SeasonRegulation")return{findOne:vi.fn(async()=>({minimumHeadCoachQualification:"CAF_A"}))};
  if(entity.name==="MatchStaffAssignment")return{findOne:vi.fn(async({where}:{where:{teamId:string}})=>assignments[where.teamId]??null)};
  if(entity.name==="CoachQualificationRead")return{createQueryBuilder:()=>{let teamId="";const builder={where:(_q:string,p:{teamId:string})=>{teamId=p.teamId;return builder},andWhere:()=>builder,getMany:async()=>levels[teamId]?[{qualificationType:levels[teamId]}]:[]};return builder}};
  throw new Error(`unexpected repository ${entity.name}`);
 }};
}

describe("StaffEligibilityService",()=>{
 it("blocks PRE_MATCH eligibility when one head coach is below the season minimum",async()=>{
  state.ds=dataSource({home:"CAF_A",away:"CAF_B"});
  await expect(new StaffEligibilityService().assertHeadCoachesEligible("m1")).rejects.toBeInstanceOf(StaffEligibilityError);
 });
 it("accepts coaches meeting or exceeding the minimum",async()=>{
  state.ds=dataSource({home:"CAF_A",away:"CAF_PRO"});
  await expect(new StaffEligibilityService().assertHeadCoachesEligible("m1")).resolves.toBeUndefined();
 });
});
