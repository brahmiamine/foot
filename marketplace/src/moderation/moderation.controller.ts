import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { ModerationService } from './moderation.service';
import { ModerationActionDto } from './dto/moderation-action.dto';
import { RejectProductDto } from './dto/reject-product.dto';
import { ProductStatus } from '../products/enums/product-status.enum';
import { Product } from '../products/entities/product.entity';

/**
 * Modération club des produits marketplace (US-07 à US-11). Réservé aux
 * applications backend internes (club-hub) : jamais appelable
 * directement par un navigateur, jamais par le vendeur lui-même.
 *
 * TASK-P0-027 : ServiceAuthGuard authentifie n'importe quelle application
 * possédant une clé de service valide (y compris seller-portal, pour ses
 * propres usages) — AllowedApplicationsGuard restreint explicitement ces
 * routes de modération à club-hub/federation-hub, jamais seller-portal.
 */
@Controller('moderation/products')
@UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
@AllowedApplications('club-hub', 'federation-hub')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  async findAll(
    @Query('clubId') clubId: string,
    @Query('sellerId') sellerId?: string,
    @Query('status') status?: ProductStatus,
    @Query('categoryId') categoryId?: string,
    @Query('name') name?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<Product[]> {
    return this.moderationService.findAll(clubId, {
      sellerId,
      status,
      categoryId,
      name,
      from,
      to,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
  ): Promise<Product> {
    return this.moderationService.findOne(id, clubId);
  }

  /** SUBMITTED -> UNDER_REVIEW */
  @Post(':id/review')
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
    @Body() dto: ModerationActionDto,
  ): Promise<Product> {
    return this.moderationService.transition(
      id,
      clubId,
      dto.actorId,
      ProductStatus.UNDER_REVIEW,
    );
  }

  /** UNDER_REVIEW -> APPROVED */
  @Post(':id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
    @Body() dto: ModerationActionDto,
  ): Promise<Product> {
    return this.moderationService.transition(
      id,
      clubId,
      dto.actorId,
      ProductStatus.APPROVED,
    );
  }

  /** APPROVED -> PUBLISHED */
  @Post(':id/publish')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
    @Body() dto: ModerationActionDto,
  ): Promise<Product> {
    return this.moderationService.transition(
      id,
      clubId,
      dto.actorId,
      ProductStatus.PUBLISHED,
    );
  }

  /** UNDER_REVIEW -> REJECTED (motif obligatoire) */
  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
    @Body() dto: RejectProductDto,
  ): Promise<Product> {
    return this.moderationService.transition(
      id,
      clubId,
      dto.actorId,
      ProductStatus.REJECTED,
      dto.rejectionReason,
    );
  }
}
