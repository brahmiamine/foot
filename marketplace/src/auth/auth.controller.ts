import {
  Body,
  Controller,
  GoneException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  SellerStatus,
  SellerUserStatus,
} from '../sellers/enums/seller-status.enum';
import { SellersService } from '../sellers/sellers.service';
import { ActivateSellerDto } from './dto/activate-seller.dto';
import { LoginDto } from './dto/login.dto';
import { SellerJwtService } from './seller-jwt.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sellerJwtService: SellerJwtService,
  ) {}
  @Post('register') register(): never {
    throw new GoneException(
      "L'inscription vendeur directe est désactivée. Utilisez le formulaire du site officiel du club.",
    );
  }
  @Post('activate') async activate(@Body() dto: ActivateSellerDto) {
    const user = await this.sellersService.activateInvitation(
      dto.token,
      dto.password,
    );
    return { activated: true, email: user.email };
  }
  @Post('login') async login(
    @Body() dto: LoginDto,
  ): Promise<{ token: string; sellerId: string; role: string }> {
    const user = await this.sellersService.findUserByEmail(dto.email);
    if (
      !user ||
      !(await this.sellersService.verifyPassword(user, dto.password))
    )
      throw new UnauthorizedException('Identifiants invalides');
    if (
      user.status !== SellerUserStatus.ACTIVE ||
      user.seller.status !== SellerStatus.ACTIVE
    )
      throw new UnauthorizedException('Compte vendeur inactif');
    const token = await this.sellerJwtService.sign({
      sellerUserId: user.id,
      sellerId: user.sellerId,
      role: user.role,
    });
    return { token, sellerId: user.sellerId, role: user.role };
  }
}
