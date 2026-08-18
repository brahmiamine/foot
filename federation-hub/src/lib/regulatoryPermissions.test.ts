import { describe,expect,it,vi } from "vitest";
import type { DataSource } from "typeorm";
import type { SsoUser } from "./ssoSession";
import { evaluateRegulatoryPermission,hasRegulatoryPermission,resolveRegulatoryPermission,type RegulatoryPermissionMode } from "./regulatoryPermissions";

const user=(role:SsoUser["role"]="FEDERATION_ADMIN"):SsoUser=>({id:"u1",email:"u@test",name:"U",role,teamId:null,federationId:"f1",leagueId:null});
const source=(permissions:string[]):DataSource=>({query:vi.fn(async()=>permissions.map(permission=>({permission})))}) as unknown as DataSource;

function sourceWithMode(mode: RegulatoryPermissionMode, permissions: string[]) {
  const inserts: unknown[][] = [];
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes("regulatory_permission_mode_settings")) return [{ mode }];
    if (sql.includes("INSERT INTO regulatory_permission_warnings")) { inserts.push(params ?? []); return []; }
    if (sql.includes("regulatory_user_permissions")) return permissions.map(permission => ({ permission }));
    return [];
  });
  return { ds: { query } as unknown as DataSource, inserts };
}

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

describe("evaluateRegulatoryPermission (FED-011, pure)",()=>{
 it("LEGACY keeps historical behaviour: no rows = allow, rows = strict whitelist",()=>{
  expect(evaluateRegulatoryPermission("LEGACY",false,false)).toEqual({allowed:true,shouldWarn:false});
  expect(evaluateRegulatoryPermission("LEGACY",true,false)).toEqual({allowed:false,shouldWarn:false});
  expect(evaluateRegulatoryPermission("LEGACY",true,true)).toEqual({allowed:true,shouldWarn:false});
 });
 it("ENFORCE requires an explicit matching row even when none are configured",()=>{
  expect(evaluateRegulatoryPermission("ENFORCE",false,false)).toEqual({allowed:false,shouldWarn:false});
  expect(evaluateRegulatoryPermission("ENFORCE",true,false)).toEqual({allowed:false,shouldWarn:false});
  expect(evaluateRegulatoryPermission("ENFORCE",true,true)).toEqual({allowed:true,shouldWarn:false});
 });
 it("WARN never blocks but flags exactly what ENFORCE would have refused",()=>{
  expect(evaluateRegulatoryPermission("WARN",false,false)).toEqual({allowed:true,shouldWarn:true});
  expect(evaluateRegulatoryPermission("WARN",true,false)).toEqual({allowed:true,shouldWarn:true});
  expect(evaluateRegulatoryPermission("WARN",true,true)).toEqual({allowed:true,shouldWarn:false});
 });
});

describe("hasRegulatoryPermission is mode-aware (FED-011)",()=>{
 it("LEGACY mode (default) is unaffected by the new mode setting",async()=>{
  const {ds}=sourceWithMode("LEGACY",[]);
  await expect(hasRegulatoryPermission(ds,user(),"discipline.decide")).resolves.toBe(true);
 });
 it("ENFORCE denies a user with zero configured rows",async()=>{
  const {ds}=sourceWithMode("ENFORCE",[]);
  await expect(hasRegulatoryPermission(ds,user(),"discipline.decide")).resolves.toBe(false);
 });
 it("WARN allows but logs a warning for a denial ENFORCE would have produced",async()=>{
  const {ds,inserts}=sourceWithMode("WARN",[]);
  await expect(hasRegulatoryPermission(ds,user(),"discipline.decide","/api/admin/discipline/1/decision")).resolves.toBe(true);
  expect(inserts).toHaveLength(1);
  expect(inserts[0].slice(1)).toEqual(["u1","discipline.decide","/api/admin/discipline/1/decision"]);
 });
 it("WARN logs nothing when the account already has the matching permission",async()=>{
  const {ds,inserts}=sourceWithMode("WARN",["discipline.decide"]);
  await expect(hasRegulatoryPermission(ds,user(),"discipline.decide")).resolves.toBe(true);
  expect(inserts).toHaveLength(0);
 });
 it("platform roles bypass every mode",async()=>{
  const {ds}=sourceWithMode("ENFORCE",[]);
  await expect(hasRegulatoryPermission(ds,user("PLATFORM_SUPERADMIN"),"discipline.decide")).resolves.toBe(true);
 });
});
