import { NextRequest,NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { CompetitionRegistration,Saison } from "@/entities/Regulatory";
import { createPaymentIntent,type PaymentProvider } from "@/lib/paymentApiClient";

const PROVIDERS=new Set<PaymentProvider>(["konnect","flouci","paymee"]);

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const session=await auth();if(!session?.user.teamId)return NextResponse.json({error:"Unauthorized"},{status:401});
 try{
  const {id}=await params;const ds=await getDataSource();
  const entry=await ds.getRepository(CompetitionRegistration).findOne({where:{id,clubId:session.user.teamId}});
  if(!entry)return NextResponse.json({error:"Engagement introuvable"},{status:404});
  if(!["DRAFT","CHANGES_REQUESTED"].includes(entry.status))return NextResponse.json({error:"Le paiement ne peut être initié que sur un engagement modifiable"},{status:409});
  const season=await ds.getRepository(Saison).findOne({where:{id:entry.seasonId}});if(!season)return NextResponse.json({error:"Saison introuvable"},{status:404});
  const amount=Number(entry.feesAmount??season.competitionEntryFee??0);if(!(amount>0))return NextResponse.json({error:"Aucun droit d'engagement n'est dû"},{status:409});
  const body=await request.json().catch(()=>({}));
  const provider=(String(body.provider??process.env.PAYMENT_PROVIDER??"konnect").toLowerCase()) as PaymentProvider;
  if(!PROVIDERS.has(provider))return NextResponse.json({error:"Provider de paiement invalide"},{status:400});
  const origin=request.nextUrl.origin;const returnUrl=`${origin}/admin/federation/competition-entries?payment=return&entry=${encodeURIComponent(id)}`;
  const payment=await createPaymentIntent({
   provider,orderId:`competition-entry:${id}`,amount,currency:"TND",description:`Droits d'engagement ${entry.seasonId}`,returnUrl,cancelUrl:`${returnUrl}&cancelled=1`,
   customer:{email:session.user.email,firstName:typeof body.firstName==="string"?body.firstName:undefined,lastName:typeof body.lastName==="string"?body.lastName:undefined,phone:typeof body.phone==="string"?body.phone:undefined},
   metadata:{domain:"COMPETITION_ENTRY",registrationId:id,clubId:session.user.teamId,seasonId:entry.seasonId},
  });
  entry.feesAmount=String(amount);entry.feesPaymentId=payment.paymentId;await ds.getRepository(CompetitionRegistration).save(entry);
  return NextResponse.json({paymentId:payment.paymentId,redirectUrl:payment.redirectUrl,status:payment.status,provider});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erreur serveur"},{status:400});}
}
