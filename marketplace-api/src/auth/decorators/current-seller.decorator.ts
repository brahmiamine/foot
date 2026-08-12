import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedSeller } from '../interfaces/authenticated-seller.interface';

/** Compte vendeur authentifié ayant appelé un endpoint protégé par SellerJwtGuard. */
export const CurrentSeller = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedSeller => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ seller: AuthenticatedSeller }>();
    return request.seller;
  },
);
