"use server";
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getUserAccess, requirePermission } from '@/lib/access';
import { updateSellerCommission, updateSellerStatus } from '@/lib/marketplaceApiClient';
import { requireTeamId } from '@/lib/team-context';
import { AuditLogService } from '@/services/AuditLogService';
async function ctx(){const session=await auth();if(!session?.user)throw new Error('Non authentifié');const access=await getUserAccess();requirePermission(access,'marketplace.moderate');return{actorId:session.user.id,teamId:await requireTeamId()};}
export async function changeSellerStatus(id:string,status:string,formData:FormData){const {actorId,teamId}=await ctx();const reason=String(formData.get('reason')??'').trim()||undefined;await updateSellerStatus(id,teamId,status,reason);await new AuditLogService().create({userId:actorId,action:'UPDATE',entity:'MarketplaceSeller',entityId:id,after:{status,reason}});revalidatePath('/admin/marketplace/sellers');}
export async function changeSellerCommission(id:string,formData:FormData){const rate=Number(formData.get('commissionRate'));if(!Number.isFinite(rate)||rate<0||rate>100)throw new Error('Commission invalide');const {actorId,teamId}=await ctx();await updateSellerCommission(id,teamId,rate);await new AuditLogService().create({userId:actorId,action:'UPDATE',entity:'MarketplaceSeller',entityId:id,after:{commissionRate:rate}});revalidatePath('/admin/marketplace/sellers');}
