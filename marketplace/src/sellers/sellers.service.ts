import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Seller } from './entities/seller.entity';
import { SellerUser } from './entities/seller-user.entity';
import { SellerStatus, SellerUserRole } from './enums/seller-status.enum';
import { RegisterSellerDto } from '../auth/dto/register-seller.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';

const SALT_ROUNDS = 12;

/** Transitions que le club a le droit de déclencher sur un compte vendeur. */
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
    @InjectRepository(Seller)
    private readonly sellerRepository: Repository<Seller>,
    @InjectRepository(SellerUser)
    private readonly sellerUserRepository: Repository<SellerUser>,
    private readonly dataSource: DataSource,
  ) {}

  /** Inscription publique — compte créé PENDING, validé ensuite par le club (voir ModerationModule). */
  async register(dto: RegisterSellerDto): Promise<Seller> {
    const existingSeller = await this.sellerRepository.findOne({
      where: { email: dto.email },
    });
    const existingUser = await this.sellerUserRepository.findOne({
      where: { email: dto.email },
    });
    if (existingSeller || existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    return this.dataSource.transaction(async (manager) => {
      const seller = manager.create(Seller, {
        clubId: dto.clubId,
        businessName: dto.businessName,
        ownerName: dto.ownerName,
        email: dto.email,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        city: dto.city ?? null,
        country: dto.country ?? null,
        description: dto.description ?? null,
        activityCategory: dto.activityCategory ?? null,
        taxId: dto.taxId ?? null,
        tradeRegister: dto.tradeRegister ?? null,
        status: SellerStatus.PENDING,
      });
      await manager.save(seller);

      const sellerUser = manager.create(SellerUser, {
        sellerId: seller.id,
        name: dto.ownerName,
        email: dto.email,
        passwordHash,
        role: SellerUserRole.OWNER,
      });
      await manager.save(sellerUser);

      return seller;
    });
  }

  async findUserByEmail(email: string): Promise<SellerUser | null> {
    return this.sellerUserRepository.findOne({
      where: { email },
      relations: { seller: true },
    });
  }

  async verifyPassword(user: SellerUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async findById(id: string): Promise<Seller> {
    const seller = await this.sellerRepository.findOne({ where: { id } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    return seller;
  }

  async findAllByClub(
    clubId: string,
    status?: SellerStatus,
  ): Promise<Seller[]> {
    return this.sellerRepository.find({
      where: status ? { clubId, status } : { clubId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateProfile(
    sellerId: string,
    dto: UpdateSellerProfileDto,
  ): Promise<Seller> {
    const seller = await this.findById(sellerId);
    Object.assign(seller, dto);
    return this.sellerRepository.save(seller);
  }

  /** Décision du club (approve/suspend/reject/close) — jamais appelable par le vendeur. */
  async updateStatus(
    sellerId: string,
    clubId: string,
    dto: UpdateSellerStatusDto,
  ): Promise<Seller> {
    const seller = await this.sellerRepository.findOne({
      where: { id: sellerId, clubId },
    });
    if (!seller)
      throw new NotFoundException('Vendeur introuvable pour ce club');

    const allowed = CLUB_ALLOWED_SELLER_TRANSITIONS[seller.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Transition ${seller.status} → ${dto.status} non autorisée`,
      );
    }

    seller.status = dto.status;
    seller.statusReason = dto.reason ?? null;
    return this.sellerRepository.save(seller);
  }
}
