import { describe,expect,it,vi } from "vitest";
import type { DataSource } from "typeorm";
import type { SsoUser } from "./ssoSession";
import { hasRegulatoryPermission,resolveRegulatoryPermission } from "./regulatoryPermissions";

const user=(role:SsoUser["role"]="FEDERATION_ADMIN"):SsoUser=>({id:"u1",email:"u@test",name:"U",role,teamId:null,federationId:"f1",leagueId:null});
const source=(permissions:string[]):DataSource=>({query:vi.fn(async()=>permissions.map(permission=>({permission})))}) as unknown as DataSource;

describe("regulatory permissions",()=>{
 it("keeps legacy access when no explicit whitelist exists",async()=>expect(hasRegulatoryPermission(source([]),user(),"discipline.decide")).resolves.toBe(true));
 it("switches to whitelist once permissions are configured",async()=>{
  const ds=source(["discipline.view"]);
  await expect(hasRegulatoryPermission(ds,user(),"discipline.view")).resolves.toBe(true);
  await expect(hasRegulatoryPermission(ds,user(),"discipline.decide")).resolves.toBe(false);
 });
 it("always allows platform superadmin",async()=>expect(hasRegulatoryPermission(source([]),user("PLATFORM_SUPERADMIN"),"season_cycle.manage")).resolves.toBe(true));
 it("maps critical API actions to distinct permissions",()=>{
  expect(resolveRegulatoryPermission("/api/admin/competition-entries/1/approve","POST")).toBe("competition_registration.approve");
  expect(resolveRegulatoryPermission("/api/admin/player-transfers/1/homologate","POST")).toBe("transfer.homologate");
  expect(resolveRegulatoryPermission("/api/admin/discipline/1/decision","POST")).toBe("discipline.decide");
  expect(resolveRegulatoryPermission("/api/admin/season-cycles/1/prepare","POST")).toBe("season_cycle.manage");
 });
});
