import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Seller } from '@/entities/Seller';
import { SellerUser } from '@/entities/SellerUser';
import { SellerStatus, SellerUserStatus } from '@/entities/enums';
import { handleApiError } from '@/lib/api';
import { getDataSource } from '@/lib/database';
import { verifyPassword } from '@/lib/password';
import { issueSession } from '@/lib/session';
const loginSchema=z.object({email:z.string().email(),password:z.string().min(1)});
export async function POST(req:NextRequest){try{const body=loginSchema.parse(await req.json());const ds=await getDataSource();const user=await ds.getRepository(SellerUser).findOne({where:{email:body.email.trim().toLowerCase()}});const invalid=()=>NextResponse.json({error:'Email ou mot de passe incorrect.'},{status:401});if(!user)return invalid();if(user.status!==SellerUserStatus.ACTIVE)return NextResponse.json({error:'Ce compte n’est pas encore activé.'},{status:403});if(!(await verifyPassword(body.password,user.passwordHash)))return invalid();const seller=await ds.getRepository(Seller).findOne({where:{id:user.sellerId}});if(!seller)return invalid();if(seller.status!==SellerStatus.ACTIVE)return NextResponse.json({error:'Ce compte vendeur est suspendu ou fermé.'},{status:403});user.lastLoginAt=new Date();await ds.getRepository(SellerUser).save(user);const response=NextResponse.json({user:{id:user.id,name:user.name,email:user.email,role:user.role},seller:{id:seller.id,businessName:seller.businessName,status:seller.status}});return issueSession(response,{sellerUserId:user.id,sellerId:seller.id,clubId:seller.clubId,email:user.email,name:user.name,role:user.role});}catch(error){return handleApiError(error);}}
