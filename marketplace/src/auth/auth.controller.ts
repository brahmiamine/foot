import { Body, Controller, GoneException, Post, UnauthorizedException } from '@nestjs/common';
import { SellersService } from '../sellers/sellers.service';
import { SellerStatus, SellerUserStatus } from '../sellers/enums/seller-status.enum';
import { ActivateSellerDto } from './dto/activate-seller.dto';
import { LoginSellerDto } from './dto/login-seller.dto';
import { SellerJwtService } from './seller-jwt.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly sellersService: SellersService, private readonly sellerJwtService: SellerJwtService) {}
  @Post('register') register(): never { throw new GoneException("L'inscription vendeur directe est désactivée. Utilisez le formulaire du site officiel du club."); }
  @Post('activate') async activate(@Body() dto: ActivateSellerDto) { const user = await this.sellersService.activateInvitation(dto.token, dto.password); return { activated: true, email: user.email }; }
  @Post('login') async login(@Body() dto: LoginSellerDto) {
    const user = await this.sellersService.findUserByEmail(dto.email);
    if (!user || !(await this.sellersService.verifyPassword(user, dto.password))) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (user.status !== SellerUserStatus.ACTIVE || user.seller.status !== SellerStatus.ACTIVE) throw new UnauthorizedException('Ce compte vendeur n’est pas actif');
    const token = await this.sellerJwtService.sign({ sellerUserId: user.id, sellerId: user.sellerId, clubId: user.seller.clubId, email: user.email, role: user.role });
    return { accessToken: token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, seller: { id: user.seller.id, businessName: user.seller.businessName, clubId: user.seller.clubId, status: user.seller.status } };
  }
}
