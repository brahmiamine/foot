import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SellerJwtService } from '../seller-jwt.service';
import { AuthenticatedSeller } from '../interfaces/authenticated-seller.interface';

/** Authentifie un compte vendeur (sp_seller_users) via un Bearer JWT émis par POST /auth/login. */
@Injectable()
export class SellerJwtGuard implements CanActivate {
  constructor(private readonly sellerJwtService: SellerJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = header.slice('Bearer '.length);
    try {
      const seller = await this.sellerJwtService.verify(token);
      (request as unknown as { seller: AuthenticatedSeller }).seller = seller;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
