import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import {
  CLUB_ALLOWED_PRODUCT_TRANSITIONS,
  ProductStatus,
} from '../products/enums/product-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

const CLUB_VISIBLE_STATUSES = [
  ProductStatus.SUBMITTED,
  ProductStatus.UNDER_REVIEW,
  ProductStatus.APPROVED,
  ProductStatus.PUBLISHED,
  ProductStatus.REJECTED,
];

export interface ModerationFilters {
  sellerId?: string;
  status?: ProductStatus;
  categoryId?: string;
  name?: string;
  from?: string;
  to?: string;
}

/**
 * Modération club des produits marketplace (US-07 à US-11). Version
 * "canonique" de la logique déjà portée côté teamManager
 * (MarketplaceModerationService, accès cross-DB direct en l'absence de
 * cette API) — teamManager sera migré pour appeler ces endpoints à la
 * place (TS-04), sans changement de règle métier.
 */
@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(
    clubId: string,
    filters: ModerationFilters,
  ): Promise<Product[]> {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.seller', 'seller')
      .where('seller.clubId = :clubId', { clubId })
      .andWhere('product.status IN (:...statuses)', {
        statuses: CLUB_VISIBLE_STATUSES,
      });

    if (filters.sellerId)
      qb.andWhere('product.sellerId = :sellerId', {
        sellerId: filters.sellerId,
      });
    if (filters.status)
      qb.andWhere('product.status = :status', { status: filters.status });
    if (filters.categoryId)
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    if (filters.name)
      qb.andWhere('product.name LIKE :name', { name: `%${filters.name}%` });
    if (filters.from)
      qb.andWhere('product.createdAt >= :from', {
        from: new Date(filters.from),
      });
    if (filters.to)
      qb.andWhere('product.createdAt <= :to', {
        to: new Date(`${filters.to}T23:59:59Z`),
      });

    qb.orderBy('product.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string, clubId: string): Promise<Product> {
    const product = await this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.seller', 'seller')
      .where('product.id = :id', { id })
      .andWhere('seller.clubId = :clubId', { clubId })
      .getOne();
    if (!product)
      throw new NotFoundException('Produit introuvable pour ce club');
    return product;
  }

  async transition(
    id: string,
    clubId: string,
    actorId: string,
    nextStatus: ProductStatus,
    rejectionReason?: string,
  ): Promise<Product> {
    const product = await this.findOne(id, clubId);

    const allowed = CLUB_ALLOWED_PRODUCT_TRANSITIONS[product.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new ConflictException(
        `Transition ${product.status} → ${nextStatus} non autorisée`,
      );
    }

    if (nextStatus === ProductStatus.REJECTED && !rejectionReason?.trim()) {
      throw new ConflictException('Un motif de rejet est obligatoire');
    }

    product.status = nextStatus;
    if (
      nextStatus === ProductStatus.APPROVED ||
      nextStatus === ProductStatus.REJECTED
    ) {
      product.reviewedBy = actorId;
      product.reviewedAt = new Date();
      product.rejectionReason =
        nextStatus === ProductStatus.REJECTED ? rejectionReason!.trim() : null;
    }

    const saved = await this.productRepository.save(product);

    if (
      nextStatus === ProductStatus.APPROVED ||
      nextStatus === ProductStatus.REJECTED
    ) {
      await this.notificationsService.notify(
        product.sellerId,
        nextStatus === ProductStatus.APPROVED
          ? NotificationType.PRODUCT_APPROVED
          : NotificationType.PRODUCT_REJECTED,
        nextStatus === ProductStatus.APPROVED
          ? 'Produit approuvé'
          : 'Produit rejeté',
        nextStatus === ProductStatus.APPROVED
          ? `Votre produit "${product.name}" a été approuvé par le club.`
          : `Votre produit "${product.name}" a été rejeté. Motif : ${product.rejectionReason}`,
      );
    }

    return saved;
  }
}
