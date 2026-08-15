import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assignMatchStaff, listMatchStaff, removeMatchStaff } from "@/lib/matchOperationsStaffClient";

export const runtime="nodejs";

export async function GET(request:NextRequest){
  const session=await auth();if(!session?.user.teamId)return NextResponse.json({error:"Unauthorized"},{status:401});
  const matchId=request.nextUrl.searchParams.get("matchId");if(!matchId)return NextResponse.json({error:"matchId requis"},{status:400});
  try{return NextResponse.json(await listMatchStaff(matchId,session.user.teamId));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erreur serveur"},{status:400});}
}

export async function POST(request:NextRequest){
  const session=await auth();if(!session?.user.teamId)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["ADMIN","CLUB_ADMIN"].includes(session.user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  try{const body=await request.json();if(!body.matchId||!body.staffId||!body.role)return NextResponse.json({error:"matchId, staffId et role requis"},{status:400});
    return NextResponse.json(await assignMatchStaff({matchId:String(body.matchId),teamId:session.user.teamId,staffId:String(body.staffId),role:body.role,actorUserId:session.user.id}),{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erreur serveur"},{status:409});}
}

export async function DELETE(request:NextRequest){
  const session=await auth();if(!session?.user.teamId)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["ADMIN","CLUB_ADMIN"].includes(session.user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  try{const body=await request.json();if(!body.id)return NextResponse.json({error:"id requis"},{status:400});await removeMatchStaff({id:String(body.id),teamId:session.user.teamId});return NextResponse.json({ok:true});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erreur serveur"},{status:409});}
}
