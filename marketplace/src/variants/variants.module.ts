import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductVariant, Product])],
  controllers: [VariantsController],
  providers: [VariantsService],
})
export class VariantsModule {}
