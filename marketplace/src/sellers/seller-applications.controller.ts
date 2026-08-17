import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { CreateSellerApplicationDto } from './dto/create-seller-application.dto';
import { ReviewSellerApplicationDto } from './dto/review-seller-application.dto';
import { SellerApplicationStatus } from './enums/seller-application-status.enum';
import { SellersService } from './sellers.service';

@Controller('seller-applications')
@UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
export class SellerApplicationsController {
  constructor(private readonly sellersService: SellersService) {}

  @Post()
  @AllowedApplications('club-ob')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  create(@Body() dto: CreateSellerApplicationDto) {
    return this.sellersService.createApplication(dto);
  }

  @Get()
  @AllowedApplications('club-hub', 'federation-hub')
  list(
    @Query('clubId') clubId: string,
    @Query('status') status?: SellerApplicationStatus,
  ) {
    return this.sellersService.findApplicationsByClub(clubId, status);
  }

  @Get(':id')
  @AllowedApplications('club-hub', 'federation-hub')
  findOne(@Param('id') id: string, @Query('clubId') clubId: string) {
    return this.sellersService.findApplication(id, clubId);
  }

  @Post(':id/review')
  @AllowedApplications('club-hub', 'federation-hub')
  review(
    @Param('id') id: string,
    @Query('clubId') clubId: string,
    @Body() dto: ReviewSellerApplicationDto,
  ) {
    return this.sellersService.markApplicationUnderReview(
      id,
      clubId,
      dto.actorId,
    );
  }

  @Post(':id/approve')
  @AllowedApplications('club-hub', 'federation-hub')
  approve(
    @Param('id') id: string,
    @Query('clubId') clubId: string,
    @Body() dto: ReviewSellerApplicationDto,
  ) {
    return this.sellersService.approveApplication(id, clubId, dto.actorId);
  }

  @Post(':id/reject')
  @AllowedApplications('club-hub', 'federation-hub')
  reject(
    @Param('id') id: string,
    @Query('clubId') clubId: string,
    @Body() dto: ReviewSellerApplicationDto,
  ) {
    return this.sellersService.rejectApplication(
      id,
      clubId,
      dto.actorId,
      dto.reason,
    );
  }
}
