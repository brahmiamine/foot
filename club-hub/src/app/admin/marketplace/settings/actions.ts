"use server";
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getUserAccess, requirePermission } from '@/lib/access';
import { updateMarketplaceSettings } from '@/lib/marketplaceApiClient';
import { requireTeamId } from '@/lib/team-context';
import { AuditLogService } from '@/services/AuditLogService';
export async function saveMarketplaceSettings(formData: FormData) { const session=await auth(); if(!session?.user) throw new Error('Non authentifié'); const access=await getUserAccess(); requirePermission(access,'marketplace.moderate'); const teamId=await requireTeamId(); const settings={ sellerApplicationsEnabled:formData.get('sellerApplicationsEnabled')==='on', sellerApprovalRequired:formData.get('sellerApprovalRequired')==='on', productApprovalRequired:formData.get('productApprovalRequired')==='on', productReapprovalOnSensitiveChange:formData.get('productReapprovalOnSensitiveChange')==='on' }; await updateMarketplaceSettings(teamId,session.user.id,settings); await new AuditLogService().create({ userId:session.user.id, action:'UPDATE', entity:'MarketplaceSettings', entityId:teamId, after:settings }); revalidatePath('/admin/marketplace/settings'); }
