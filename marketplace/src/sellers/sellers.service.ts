import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { CentralNotificationsClient } from '../notifications/central-notifications.client';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSellerApplicationDto } from './dto/create-seller-application.dto';
import { UpdateMarketplaceSettingsDto } from './dto/update-marketplace-settings.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';
import { MarketplaceClubSettings } from './entities/marketplace-club-settings.entity';
import { SellerApplication } from './entities/seller-application.entity';
import { SellerInvite } from './entities/seller-invite.entity';
import { Seller } from './entities/seller.entity';
import { SellerUser } from './entities/seller-user.entity';
import { SellerApplicationStatus } from './enums/seller-application-status.enum';
import { SellerStatus, SellerUserRole, SellerUserStatus } from './enums/seller-status.enum';

const SALT_ROUNDS = 12;
const INVITE_TTL_HOURS = 48;
const CLUB_ALLOWED_SELLER_TRANSITIONS: Record<SellerStatus, SellerStatus[]> = {
  [SellerStatus.PENDING]: [SellerStatus.ACTIVE, SellerStatus.REJECTED],
  [SellerStatus.ACTIVE]: [SellerStatus.SUSPENDED, SellerStatus.CLOSED],
  [SellerStatus.SUSPENDED]: [SellerStatus.ACTIVE, SellerStatus.CLOSED],
  [SellerStatus.REJECTED]: [],
  [SellerStatus.CLOSED]: [],
};

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(Seller) private readonly sellerRepository: Repository<Seller>,
    @InjectRepository(SellerUser) private readonly sellerUserRepository: Repository<SellerUser>,
    @InjectRepository(SellerApplication) private readonly applicationRepository: Repository<SellerApplication>,
    @InjectRepository(SellerInvite) private readonly inviteRepository: Repository<SellerInvite>,
    @InjectRepository(MarketplaceClubSettings) private readonly settingsRepository: Repository<MarketplaceClubSettings>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly centralNotifications: CentralNotificationsClient,
    private readonly sellerNotifications: NotificationsService,
  ) {}

  async getClubSettings(clubId: string): Promise<MarketplaceClubSettings> {
    if (!clubId?.trim()) throw new NotFoundException('Club introuvable');
    const existing = await this.settingsRepository.findOne({ where: { clubId } });
    return existing ?? this.settingsRepository.create({ clubId, sellerApplicationsEnabled: true, sellerApprovalRequired: true, productApprovalRequired: true, productReapprovalOnSensitiveChange: true, updatedBy: null });
  }
  async updateClubSettings(clubId: string, dto: UpdateMarketplaceSettingsDto): Promise<MarketplaceClubSettings> {
    let settings = await this.settingsRepository.findOne({ where: { clubId } });
    if (!settings) settings = this.settingsRepository.create({ clubId, sellerApplicationsEnabled: true, sellerApprovalRequired: true, productApprovalRequired: true, productReapprovalOnSensitiveChange: true, updatedBy: null });
    if (dto.sellerApplicationsEnabled !== undefined) settings.sellerApplicationsEnabled = dto.sellerApplicationsEnabled;
    if (dto.sellerApprovalRequired !== undefined) settings.sellerApprovalRequired = dto.sellerApprovalRequired;
    if (dto.productApprovalRequired !== undefined) settings.productApprovalRequired = dto.productApprovalRequired;
    if (dto.productReapprovalOnSensitiveChange !== undefined) settings.productReapprovalOnSensitiveChange = dto.productReapprovalOnSensitiveChange;
    settings.updatedBy = dto.actorId;
    return this.settingsRepository.save(settings);
  }

  async createApplication(dto: CreateSellerApplicationDto): Promise<SellerApplication> {
    const settings = await this.getClubSettings(dto.clubId);
    if (!settings.sellerApplicationsEnabled) throw new ConflictException('Les demandes vendeurs sont actuellement fermées pour ce club');
    const email = dto.email.trim().toLowerCase();
    if (await this.sellerRepository.findOne({ where: { email } })) throw new ConflictException('Un compte vendeur existe déjà avec cet email');
    const existing = await this.applicationRepository.findOne({ where: [{ clubId: dto.clubId, email, status: SellerApplicationStatus.PENDING }, { clubId: dto.clubId, email, status: SellerApplicationStatus.UNDER_REVIEW }] });
    if (existing) throw new ConflictException('Une demande est déjà en cours pour cet email');
    const application = await this.applicationRepository.save(this.applicationRepository.create({ ...dto, email, phone: dto.phone ?? null, address: dto.address ?? null, city: dto.city ?? null, country: dto.country ?? null, description: dto.description ?? null, activityCategory: dto.activityCategory ?? null, taxId: dto.taxId ?? null, tradeRegister: dto.tradeRegister ?? null, documents: dto.documents ?? null, status: SellerApplicationStatus.PENDING, rejectionReason: null, reviewedBy: null, reviewedAt: null, sellerId: null }));
    if (!settings.sellerApprovalRequired) return (await this.approveApplication(application.id, application.clubId, 'SYSTEM')).application;
    await this.centralNotifications.notifyClubAdmins(application.clubId, 'SELLER_APPLICATION_CREATED', 'Nouvelle demande vendeur', `${application.businessName} a envoyé une demande pour vendre sur la boutique du club.`, { applicationId: application.id, businessName: application.businessName }, `seller-application:${application.id}:created`);
    return application;
  }
  findApplicationsByClub(clubId: string, status?: SellerApplicationStatus): Promise<SellerApplication[]> { return this.applicationRepository.find({ where: status ? { clubId, status } : { clubId }, order: { createdAt: 'DESC' } }); }
  async findApplication(id: string, clubId: string): Promise<SellerApplication> { const application = await this.applicationRepository.findOne({ where: { id, clubId } }); if (!application) throw new NotFoundException('Demande vendeur introuvable pour ce club'); return application; }
  async markApplicationUnderReview(id: string, clubId: string, actorId: string): Promise<SellerApplication> { const application = await this.findApplication(id, clubId); if (application.status !== SellerApplicationStatus.PENDING) throw new ConflictException(`Demande non révisable dans le statut ${application.status}`); application.status = SellerApplicationStatus.UNDER_REVIEW; application.reviewedBy = actorId; application.reviewedAt = new Date(); return this.applicationRepository.save(application); }

  async approveApplication(id: string, clubId: string, actorId: string): Promise<{ application: SellerApplication; seller: Seller }> {
    const application = await this.findApplication(id, clubId);
    if (![SellerApplicationStatus.PENDING, SellerApplicationStatus.UNDER_REVIEW].includes(application.status)) throw new ConflictException(`Demande non approuvable dans le statut ${application.status}`);
    const rawToken = randomBytes(48).toString('base64url'); const tokenHash = this.hashToken(rawToken); const temporaryPasswordHash = await bcrypt.hash(randomBytes(48).toString('hex'), SALT_ROUNDS); const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
    const result = await this.dataSource.transaction(async (manager) => {
      if (await manager.findOne(Seller, { where: { email: application.email } }) || await manager.findOne(SellerUser, { where: { email: application.email } })) throw new ConflictException('Cet email est déjà utilisé');
      const seller = await manager.save(manager.create(Seller, { clubId: application.clubId, businessName: application.businessName, ownerName: application.ownerName, email: application.email, phone: application.phone, address: application.address, city: application.city, country: application.country, description: application.description, activityCategory: application.activityCategory, taxId: application.taxId, tradeRegister: application.tradeRegister, documents: application.documents, status: SellerStatus.ACTIVE, statusReason: null }));
      const user = await manager.save(manager.create(SellerUser, { sellerId: seller.id, name: application.ownerName, email: application.email, passwordHash: temporaryPasswordHash, role: SellerUserRole.OWNER, status: SellerUserStatus.INVITED, emailVerifiedAt: null }));
      await manager.save(manager.create(SellerInvite, { sellerId: seller.id, sellerUserId: user.id, tokenHash, expiresAt, usedAt: null }));
      application.status = SellerApplicationStatus.APPROVED; application.reviewedBy = actorId; application.reviewedAt = new Date(); application.rejectionReason = null; application.sellerId = seller.id; await manager.save(application); return { seller };
    });
    const portalUrl = this.config.get<string>('SELLER_PORTAL_URL') ?? 'http://localhost:3006'; const activationUrl = `${portalUrl.replace(/\/$/, '')}/activate?token=${encodeURIComponent(rawToken)}`;
    await this.centralNotifications.notifyExternalEmail(application.email, application.ownerName, application.clubId, 'SELLER_APPLICATION_APPROVED', 'Votre demande vendeur a été approuvée', `Votre demande pour ${application.businessName} a été approuvée. Activez votre compte vendeur ici : ${activationUrl}`, { applicationId: application.id, sellerId: result.seller.id, activationUrl, expiresAt: expiresAt.toISOString() }, `seller-application:${application.id}:approved`, expiresAt.toISOString());
    return { application, seller: result.seller };
  }
  async rejectApplication(id: string, clubId: string, actorId: string, reason?: string): Promise<SellerApplication> { if (!reason?.trim()) throw new ConflictException('Un motif de rejet est obligatoire'); const application = await this.findApplication(id, clubId); if (![SellerApplicationStatus.PENDING, SellerApplicationStatus.UNDER_REVIEW].includes(application.status)) throw new ConflictException(`Demande non rejetable dans le statut ${application.status}`); application.status = SellerApplicationStatus.REJECTED; application.rejectionReason = reason.trim(); application.reviewedBy = actorId; application.reviewedAt = new Date(); const saved = await this.applicationRepository.save(application); await this.centralNotifications.notifyExternalEmail(saved.email, saved.ownerName, saved.clubId, 'SELLER_APPLICATION_REJECTED', 'Votre demande vendeur a été refusée', `Votre demande pour ${saved.businessName} a été refusée. Motif : ${saved.rejectionReason}`, { applicationId: saved.id, rejectionReason: saved.rejectionReason }, `seller-application:${saved.id}:rejected`); return saved; }

  async activateInvitation(token: string, password: string): Promise<SellerUser> {
    const tokenHash = this.hashToken(token);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return this.dataSource.transaction(async (manager) => {
      const invite = await manager
        .getRepository(SellerInvite)
        .createQueryBuilder('invite')
        .setLock('pessimistic_write')
        .where('invite.tokenHash = :tokenHash', { tokenHash })
        .getOne();
      if (!invite || invite.usedAt || invite.expiresAt.getTime() <= Date.now()) throw new GoneException("Ce lien d'activation est invalide ou a expiré");
      const user = await manager.getRepository(SellerUser).findOne({ where: { id: invite.sellerUserId } });
      if (!user || user.status !== SellerUserStatus.INVITED) throw new GoneException("Ce lien d'activation n'est plus utilisable");
      user.passwordHash = passwordHash; user.status = SellerUserStatus.ACTIVE; user.emailVerifiedAt = new Date(); invite.usedAt = new Date();
      await manager.save(user); await manager.save(invite);
      return user;
    });
  }
  private hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }

  findUserByEmail(email: string): Promise<SellerUser | null> { return this.sellerUserRepository.findOne({ where: { email: email.trim().toLowerCase() }, relations: { seller: true } }); }
  verifyPassword(user: SellerUser, password: string): Promise<boolean> { return bcrypt.compare(password, user.passwordHash); }
  async findById(id: string): Promise<Seller> { const seller = await this.sellerRepository.findOne({ where: { id } }); if (!seller) throw new NotFoundException('Vendeur introuvable'); return seller; }
  findAllByClub(clubId: string, status?: SellerStatus): Promise<Seller[]> { return this.sellerRepository.find({ where: status ? { clubId, status } : { clubId }, order: { createdAt: 'DESC' } }); }
  async updateProfile(sellerId: string, dto: UpdateSellerProfileDto): Promise<Seller> { const seller = await this.findById(sellerId); Object.assign(seller, dto); return this.sellerRepository.save(seller); }
  async updateCommission(sellerId: string, clubId: string, commissionRate: number): Promise<Seller> { const seller = await this.sellerRepository.findOne({ where: { id: sellerId, clubId } }); if (!seller) throw new NotFoundException('Vendeur introuvable pour ce club'); seller.commissionRate = commissionRate.toFixed(2); return this.sellerRepository.save(seller); }
  async updateStatus(sellerId: string, clubId: string, dto: UpdateSellerStatusDto): Promise<Seller> { const seller = await this.sellerRepository.findOne({ where: { id: sellerId, clubId } }); if (!seller) throw new NotFoundException('Vendeur introuvable pour ce club'); const allowed = CLUB_ALLOWED_SELLER_TRANSITIONS[seller.status] ?? []; if (!allowed.includes(dto.status)) throw new ConflictException(`Transition ${seller.status} → ${dto.status} non autorisée`); seller.status = dto.status; seller.statusReason = dto.reason ?? null; const saved = await this.sellerRepository.save(seller); if (saved.status === SellerStatus.SUSPENDED) { await this.sellerNotifications.notify(saved.id, NotificationType.SELLER_SUSPENDED, 'Compte suspendu', dto.reason ?? 'Votre compte vendeur a été suspendu par le club.'); await this.centralNotifications.notifyExternalEmail(saved.email, saved.ownerName, saved.clubId, 'SELLER_SUSPENDED', 'Compte vendeur suspendu', dto.reason ?? 'Votre compte vendeur a été suspendu par le club.', { sellerId: saved.id }); } else if (saved.status === SellerStatus.ACTIVE) await this.sellerNotifications.notify(saved.id, NotificationType.SELLER_ACTIVATED, 'Compte actif', 'Votre compte vendeur est actif.'); return saved; }
}
