"use server";
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getUserAccess, requirePermission } from '@/lib/access';
import { approveSellerApplication, rejectSellerApplication, reviewSellerApplication } from '@/lib/marketplaceApiClient';
import { requireTeamId } from '@/lib/team-context';
import { AuditLogService } from '@/services/AuditLogService';

async function context() { const session = await auth(); if (!session?.user) throw new Error('Non authentifié'); const access = await getUserAccess(); requirePermission(access, 'marketplace.moderate'); return { teamId: await requireTeamId(), actorId: session.user.id }; }
async function audit(actorId: string, id: string, transition: string, extra?: Record<string, unknown>) { await new AuditLogService().create({ userId: actorId, action: 'UPDATE', entity: 'SellerApplication', entityId: id, after: { transition, ...extra } }); revalidatePath('/admin/marketplace/applications'); }
export async function markSellerApplicationReview(id: string, _formData: FormData) { const { teamId, actorId } = await context(); await reviewSellerApplication(id, teamId, actorId); await audit(actorId, id, 'review'); }
export async function approveSellerApplicationAction(id: string, _formData: FormData) { const { teamId, actorId } = await context(); await approveSellerApplication(id, teamId, actorId); await audit(actorId, id, 'approve'); }
export async function rejectSellerApplicationAction(id: string, formData: FormData) { const reason = String(formData.get('reason') ?? '').trim(); if (!reason) throw new Error('Motif obligatoire'); const { teamId, actorId } = await context(); await rejectSellerApplication(id, teamId, actorId, reason); await audit(actorId, id, 'reject', { reason }); }
