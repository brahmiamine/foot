import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import { AuthenticatedSeller } from './interfaces/authenticated-seller.interface';

const ISSUER = 'marketplace';
const EXPIRATION = '7d';

/**
 * Émission/vérification des JWT vendeur, indépendants du SSO commun de
 * l'écosystème — un compte marketplace est un tiers externe (vendeur), pas
 * un `User` SSO. Même mécanisme que `seller-portal/src/lib/session.ts`
 * (jose, HS256) : les deux ne partagent pas de secret ni de compte tant que
 * le Seller Portal n'a pas été migré vers cette API (voir TS-04).
 */
@Injectable()
export class SellerJwtService {
  constructor(private readonly config: ConfigService) {}

  private getSecret(): Uint8Array {
    const secret = this.config.get<string>('SELLER_JWT_SECRET');
    if (!secret) {
      throw new Error('SELLER_JWT_SECRET is not configured');
    }
    return new TextEncoder().encode(secret);
  }

  async sign(payload: AuthenticatedSeller): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(EXPIRATION)
      .sign(this.getSecret());
  }

  async verify(token: string): Promise<AuthenticatedSeller> {
    const { payload } = await jwtVerify(token, this.getSecret(), {
      issuer: ISSUER,
    });
    return {
      sellerUserId: String(payload.sellerUserId),
      sellerId: String(payload.sellerId),
      role: String(payload.role),
    };
  }
}
