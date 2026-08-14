import { NextRequest,NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { EligibilityService } from "@/services/EligibilityService";
export const runtime="nodejs";
export async function POST(request:NextRequest){
  const unauthorized=ensureServiceAuth(request);if(unauthorized)return unauthorized;
  try{const body=await request.json();if(!body.playerId||!body.clubId||!body.matchId)return NextResponse.json({error:"playerId, clubId et matchId requis"},{status:400});
    const result=await new EligibilityService().checkPlayerEligibility(body,{actorUserId:request.headers.get("x-actor-user-id"),actorRole:request.headers.get("x-actor-role")??"FEDERATION_ADMIN",ipAddress:request.headers.get("x-forwarded-for"),userAgent:request.headers.get("user-agent")});return NextResponse.json(result);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erreur serveur"},{status:400})}
}
