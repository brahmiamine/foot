import { beforeEach,describe,expect,it,vi } from "vitest";
import type { EntityManager } from "typeorm";
import { CompetitionRegistration, Saison } from "./entities";
import { assertRealApprovalPrerequisites } from "./competitionRegistrations";
import { getRegulatoryPayment } from "./paymentApiClient";

vi.mock("./paymentApiClient",()=>({getRegulatoryPayment:vi.fn()}));
const paymentMock=vi.mocked(getRegulatoryPayment);

function manager(stadium:unknown=null,financial:unknown=null):EntityManager{
  return {getRepository:(entity:{name?:string})=>({findOne:vi.fn(async()=>entity.name==="StadiumInspection"?stadium:entity.name==="FinancialCompliance"?financial:null)})} as unknown as EntityManager;
}
function item(overrides:Partial<CompetitionRegistration>={}):CompetitionRegistration{return {id:"entry",clubId:"club",teamId:"club",seasonId:"season",federationId:"fed",category:"SENIOR",status:"UNDER_REVIEW",clubLicenseId:"license",documentsComplete:true,feesAmount:null,...overrides} as CompetitionRegistration}
function season(overrides:Partial<Saison>={}):Saison{return {id:"season",requiresStadiumApproval:false,requiresFinancialCompliance:false,competitionEntryFee:null,...overrides} as Saison}

describe("assertRealApprovalPrerequisites",()=>{
 beforeEach(()=>paymentMock.mockReset());
 it("rejects an invented stadium approval id",async()=>{
  await expect(assertRealApprovalPrerequisites(manager(),item({stadiumApprovalId:"fake"}),season({requiresStadiumApproval:true}))).rejects.toThrow(/stade référencée/i);
 });
 it("rejects a non-compliant financial record",async()=>{
  await expect(assertRealApprovalPrerequisites(manager(null,null),item({financialComplianceId:"f1"}),season({requiresFinancialCompliance:true}))).rejects.toThrow(/COMPLIANT/);
 });
 it("rejects a payment that is not PAID",async()=>{
  paymentMock.mockResolvedValue({id:"p1",orderId:"o1",amount:"500",currency:"TND",status:"PENDING"});
  await expect(assertRealApprovalPrerequisites(manager(),item({feesAmount:"500",feesPaymentId:"p1"}),season())).rejects.toThrow(/n'est pas confirmé/);
 });
 it("accepts real approved records and a sufficient PAID payment",async()=>{
  paymentMock.mockResolvedValue({id:"p1",orderId:"o1",amount:"500",currency:"TND",status:"PAID"});
  const stadium={status:"APPROVED",expiresAt:"2099-01-01"};const financial={status:"COMPLIANT"};
  await expect(assertRealApprovalPrerequisites(manager(stadium,financial),item({stadiumApprovalId:"s1",financialComplianceId:"f1",feesAmount:"500",feesPaymentId:"p1"}),season({requiresStadiumApproval:true,requiresFinancialCompliance:true}))).resolves.toBeUndefined();
 });
});
