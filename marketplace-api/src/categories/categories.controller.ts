import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { CategoriesService } from './categories.service';
import { UpsertCategoryDto } from './dto/upsert-category.dto';
import { ProductCategory } from './entities/product-category.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** Lecture publique — un vendeur en a besoin pour choisir une catégorie à la création d'un produit. */
  @Get()
  async findAll(@Query('clubId') clubId: string): Promise<ProductCategory[]> {
    return this.categoriesService.findAllByClub(clubId);
  }

  /** Gestion des catégories — réservée au club (teamManager). */
  @Post()
  @UseGuards(ServiceAuthGuard)
  async create(
    @Query('clubId') clubId: string,
    @Body() dto: UpsertCategoryDto,
  ): Promise<ProductCategory> {
    return this.categoriesService.create(clubId, dto);
  }

  @Patch(':id')
  @UseGuards(ServiceAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
    @Body() dto: UpsertCategoryDto,
  ): Promise<ProductCategory> {
    return this.categoriesService.update(id, clubId, dto);
  }

  @Delete(':id')
  @UseGuards(ServiceAuthGuard)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
  ): Promise<{ success: true }> {
    await this.categoriesService.remove(id, clubId);
    return { success: true };
  }
}
