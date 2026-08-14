import { createHmac, timingSafeEqual } from 'crypto';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { CheckoutService, CheckoutResult } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';

/**
 * TASK-P0-004 (todo.md). `memberId` explicite (comme
 * cart/cart.controller.ts) : marketplace n'a pas de notion de session
 * membre, la confiance vient de ServiceAuthGuard (l'appelant, ex. `ob`, a
 * déjà authentifié le membre lui-même).
 */
@Controller()
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('internal/checkout')
  @UseGuards(ServiceAuthGuard)
  async checkout(
    @Query('memberId') memberId: string,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<CheckoutResult> {
    return this.checkoutService.checkout(memberId, dto, idempotencyKey);
  }

  /**
   * Reçoit le webhook applicatif signé émis par payments une fois un
   * paiement PAID/FAILED/EXPIRED (voir payments/src/webhooks). Le corps
   * n'est jamais source de vérité : seule la signature authentifie
   * l'appelant, puis reconcilePaymentStatus relit GET /payments/:id auprès
   * de payments avant toute décision — même pattern que
   * ticketing/club-hub (app/api/payments/webhook/route.ts).
   */
  @Post('payments/webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-payment-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const rawBody = request.rawBody;
    if (
      !rawBody ||
      !this.isValidSignature(rawBody.toString('utf8'), signature)
    ) {
      throw new UnauthorizedException(
        'Signature de webhook manquante ou invalide.',
      );
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as {
      paymentId?: string;
    };
    if (!payload.paymentId) {
      return { received: true };
    }

    // Laisse toute erreur se propager (500) plutôt que de l'avaler : c'est
    // ce qui permet à payments de retenter la livraison du webhook
    // (voir payments/src/webhooks/webhook-dispatch.service.ts) — un
    // reconcilePaymentStatus qui échoue (payments injoignable, base
    // indisponible) ne doit jamais être silencieusement perdu.
    await this.checkoutService.reconcilePaymentStatus(payload.paymentId);

    return { received: true };
  }

  private isValidSignature(
    rawBody: string,
    header: string | undefined,
  ): boolean {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret || !header) return false;

    const prefix = 'sha256=';
    if (!header.startsWith(prefix)) return false;
    const provided = header.slice(prefix.length);

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    const providedBuf = Buffer.from(provided, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (providedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(providedBuf, expectedBuf);
  }
}
