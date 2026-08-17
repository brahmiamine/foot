import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMarketplaceSettingsDto {
  @IsOptional() @IsBoolean() sellerApplicationsEnabled?: boolean;
  @IsOptional() @IsBoolean() sellerApprovalRequired?: boolean;
  @IsOptional() @IsBoolean() productApprovalRequired?: boolean;
  @IsOptional() @IsBoolean() productReapprovalOnSensitiveChange?: boolean;
  @IsString() @MaxLength(191) actorId: string;
}
