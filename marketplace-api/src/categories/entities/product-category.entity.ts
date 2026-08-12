import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Référentiel de catégories défini par l'administration du club. Le
 * vendeur choisit une catégorie existante, il n'en crée pas (voir
 * ProductsModule). `clubId` référence logiquement `teams.id` — pas de
 * contrainte FK réelle, marketplace-api n'ayant pas accès à la base
 * partagée `foot`.
 */
@Entity('product_categories')
@Index(['clubId', 'slug'], { unique: true })
export class ProductCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  clubId: string;

  @Column({ type: 'varchar', length: 191 })
  name: string;

  @Column({ type: 'varchar', length: 191 })
  slug: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  parentId: string | null;

  // Commission spécifique à la catégorie ; si null, la commission par
  // défaut du vendeur (Seller.commissionRate) s'applique.
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: string | null;
}
