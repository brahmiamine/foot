import { getDataSource } from "@/lib/database";
import { Order, OrderStatus } from "@/entities/Order";
import { OrderItem } from "@/entities/OrderItem";
import { Product } from "@/entities/Product";
import { Repository } from "typeorm";

export interface OrderItemInput {
  productId: number;
  quantity: number;
}

/**
 * Service for shop Order operations — commandes passées sur la boutique du
 * club (`cms_products`, catalogue seul jusqu'ici). `totalAmount` est
 * recalculé à partir des lignes de commande à chaque création.
 */
export class ShopOrderService {
  private async getOrderRepository(): Promise<Repository<Order>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Order);
  }

  private async getOrderItemRepository(): Promise<Repository<OrderItem>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(OrderItem);
  }

  private async getProductRepository(): Promise<Repository<Product>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Product);
  }

  async findAll(teamId: string): Promise<Order[]> {
    const repository = await this.getOrderRepository();
    return repository.find({ where: { teamId }, relations: ["user"], order: { createdAt: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<Order | null> {
    const repository = await this.getOrderRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["user"] });
  }

  /** Lignes d'une commande, chargées séparément (pas de relation OneToMany sur `Order`). */
  async findItems(orderId: number): Promise<OrderItem[]> {
    const repository = await this.getOrderItemRepository();
    return repository.find({ where: { orderId } });
  }

  async create(
    data: { userId?: string | null; customerName?: string | null; customerPhone?: string | null; notes?: string | null; items: OrderItemInput[] },
    teamId: string
  ): Promise<Order> {
    if (data.items.length === 0) {
      throw new Error("Une commande doit contenir au moins un article");
    }

    const productRepository = await this.getProductRepository();
    const orderRepository = await this.getOrderRepository();
    const itemRepository = await this.getOrderItemRepository();

    let total = 0;
    const resolvedItems: Array<{ productId: number; productName: string; quantity: number; unitPrice: string }> = [];
    for (const item of data.items) {
      const product = await productRepository.findOne({ where: { id: item.productId, teamId } });
      if (!product) throw new Error("Produit non trouvé");
      total += Number(product.price) * item.quantity;
      resolvedItems.push({ productId: product.id, productName: product.nameFr, quantity: item.quantity, unitPrice: product.price });
    }

    const order = orderRepository.create({
      teamId,
      userId: data.userId ?? null,
      customerName: data.customerName ?? null,
      customerPhone: data.customerPhone ?? null,
      notes: data.notes ?? null,
      status: "PENDING",
      totalAmount: total.toFixed(3),
    });
    const saved = await orderRepository.save(order);

    const items = resolvedItems.map((i) => itemRepository.create({ ...i, orderId: saved.id }));
    await itemRepository.save(items);

    return saved;
  }

  async setStatus(id: number, teamId: string, status: OrderStatus): Promise<Order> {
    const repository = await this.getOrderRepository();
    const order = await this.findById(id, teamId);
    if (!order) throw new Error("Commande non trouvée");
    order.status = status;
    return repository.save(order);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getOrderRepository();
    const order = await this.findById(id, teamId);
    if (!order) throw new Error("Commande non trouvée");
    await repository.remove(order);
    return true;
  }
}
