import "reflect-metadata";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./Product";

@Entity({ name: "sp_product_images" })
export class ProductImage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  productId!: string;

  @ManyToOne("Product", (p: Product) => p.images, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product!: Product;

  @Column({ type: "varchar", length: 500 })
  url!: string;

  @Column({ type: "int", default: 0 })
  position!: number;
}
