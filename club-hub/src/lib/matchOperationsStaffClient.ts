export type MatchStaffRole = "HEAD_COACH" | "ASSISTANT_COACH" | "MEDICAL" | "STAFF";
export type MatchStaffAssignmentDto = { id:string;matchId:string;teamId:string;staffId:string;role:MatchStaffRole };

function config(){
  const base=process.env.MATCH_OPERATIONS_URL,key=process.env.MATCH_OPERATIONS_SERVICE_API_KEY;
  if(!base||!key)throw new Error("MATCH_OPERATIONS_URL/MATCH_OPERATIONS_SERVICE_API_KEY non configurés");
  return {base:base.replace(/\/$/,""),key};
}

async function call(path:string,init:RequestInit={}){
  const {base,key}=config();
  const response=await fetch(`${base}${path}`,{...init,headers:{"content-type":"application/json","x-api-key":key,...init.headers},cache:"no-store",signal:AbortSignal.timeout(5000)});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error??`match-operations ${response.status}`);
  return body;
}

export const listMatchStaff=(matchId:string,teamId:string)=>call(`/api/internal/match-staff?matchId=${encodeURIComponent(matchId)}&teamId=${encodeURIComponent(teamId)}`) as Promise<MatchStaffAssignmentDto[]>;
export const assignMatchStaff=(input:{matchId:string;teamId:string;staffId:string;role:MatchStaffRole;actorUserId:string})=>call("/api/internal/match-staff",{method:"POST",headers:{"x-actor-user-id":input.actorUserId},body:JSON.stringify(input)}) as Promise<MatchStaffAssignmentDto>;
export const removeMatchStaff=(input:{id:string;teamId:string})=>call("/api/internal/match-staff",{method:"DELETE",body:JSON.stringify(input)}) as Promise<{ok:boolean}>;
