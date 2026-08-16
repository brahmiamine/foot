import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';

@Controller('internal')
@UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
@AllowedApplications('seller-portal')
export class InternalVariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post('products/:productId/variants')
  create(
    @Query('sellerId') sellerId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto,
  ): Promise<ProductVariant> {
    return this.variantsService.create(productId, sellerId, dto);
  }

  @Patch('variants/:id')
  update(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    return this.variantsService.updateById(id, sellerId, dto);
  }

  @Delete('variants/:id')
  async remove(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.variantsService.removeById(id, sellerId);
    return { success: true };
  }
}
