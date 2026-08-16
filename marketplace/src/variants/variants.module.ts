import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { InternalVariantsController } from './internal-variants.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductVariant, Product, InventoryItem]),
  ],
  controllers: [VariantsController, InternalVariantsController],
  providers: [VariantsService],
})
export class VariantsModule {}
