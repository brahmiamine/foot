import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('sp_product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 191 })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  sku: string;

  @Column({ type: 'json' })
  attributes: Record<string, string>;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  price: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
