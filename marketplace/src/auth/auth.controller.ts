import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { SellersService } from '../sellers/sellers.service';
import { SellerJwtService } from './seller-jwt.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { LoginDto } from './dto/login.dto';
import { Seller } from '../sellers/entities/seller.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sellerJwtService: SellerJwtService,
  ) {}

  /** Inscription publique d'un vendeur — compte créé PENDING (voir ModerationModule pour l'activation). */
  @Post('register')
  async register(@Body() dto: RegisterSellerDto): Promise<Seller> {
    return this.sellersService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ token: string; sellerId: string; role: string }> {
    const user = await this.sellersService.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const valid = await this.sellersService.verifyPassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const token = await this.sellerJwtService.sign({
      sellerUserId: user.id,
      sellerId: user.sellerId,
      role: user.role,
    });

    return { token, sellerId: user.sellerId, role: user.role };
  }
}
