export interface EligibilityResponse { eligible:boolean;blockingReasons:string[];warnings:string[] }
export async function checkMatchEligibility(input:{playerId:string;clubId:string;matchId:string},actor:{userId:string;role:string}):Promise<EligibilityResponse>{
  const base=process.env.MATCH_OPERATIONS_URL,key=process.env.MATCH_OPERATIONS_SERVICE_API_KEY;
  if(!base||!key)throw new Error("MATCH_OPERATIONS_URL/MATCH_OPERATIONS_SERVICE_API_KEY non configurés");
  const response=await fetch(`${base.replace(/\/$/,"")}/api/internal/eligibility`,{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"x-actor-user-id":actor.userId,"x-actor-role":actor.role},body:JSON.stringify(input),signal:AbortSignal.timeout(5000)});
  const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error??`match-operations ${response.status}`);return body;
}
