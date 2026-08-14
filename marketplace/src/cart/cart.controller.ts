import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { CartService } from './cart.service';
import { CartItem } from './entities/cart-item.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

/**
 * TASK-P0-004 (todo.md). `memberId` est pris explicitement en paramètre
 * plutôt que dérivé d'un JWT membre (marketplace n'a pas cette notion,
 * seulement SellerJwtGuard) — même pattern que
 * products/internal-products.controller.ts : la confiance vient de
 * ServiceAuthGuard (clé de service propre à l'application appelante, ex.
 * `ob`, qui a déjà authentifié le membre via sa propre session sso).
 */
@Controller('internal/cart')
@UseGuards(ServiceAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async view(@Query('memberId') memberId: string): Promise<CartItem[]> {
    return this.cartService.viewCart(memberId);
  }

  @Post('items')
  async addItem(
    @Query('memberId') memberId: string,
    @Body() dto: AddCartItemDto,
  ): Promise<CartItem> {
    return this.cartService.addItem(
      memberId,
      dto.productId,
      dto.variantId,
      dto.quantity,
    );
  }

  @Patch('items/:itemId')
  async updateItem(
    @Query('memberId') memberId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartItem | { removed: true }> {
    const updated = await this.cartService.updateItemQuantity(
      memberId,
      itemId,
      dto.quantity,
    );
    return updated ?? { removed: true };
  }

  @Delete('items/:itemId')
  async removeItem(
    @Query('memberId') memberId: string,
    @Param('itemId') itemId: string,
  ): Promise<{ success: true }> {
    await this.cartService.removeItem(memberId, itemId);
    return { success: true };
  }
}
