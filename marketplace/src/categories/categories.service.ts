import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { UpsertCategoryDto } from './dto/upsert-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly repository: Repository<ProductCategory>,
  ) {}

  async findAllByClub(clubId: string): Promise<ProductCategory[]> {
    return this.repository.find({ where: { clubId }, order: { name: 'ASC' } });
  }

  async create(
    clubId: string,
    dto: UpsertCategoryDto,
  ): Promise<ProductCategory> {
    const category = this.repository.create({
      clubId,
      name: dto.name,
      slug: dto.slug,
      parentId: dto.parentId ?? null,
      commissionRate:
        dto.commissionRate !== undefined ? String(dto.commissionRate) : null,
    });
    return this.repository.save(category);
  }

  async update(
    id: string,
    clubId: string,
    dto: UpsertCategoryDto,
  ): Promise<ProductCategory> {
    const category = await this.repository.findOne({ where: { id, clubId } });
    if (!category)
      throw new NotFoundException('Catégorie introuvable pour ce club');

    category.name = dto.name;
    category.slug = dto.slug;
    category.parentId = dto.parentId ?? null;
    category.commissionRate =
      dto.commissionRate !== undefined ? String(dto.commissionRate) : null;
    return this.repository.save(category);
  }

  async remove(id: string, clubId: string): Promise<void> {
    const result = await this.repository.delete({ id, clubId });
    if (!result.affected)
      throw new NotFoundException('Catégorie introuvable pour ce club');
  }
}
