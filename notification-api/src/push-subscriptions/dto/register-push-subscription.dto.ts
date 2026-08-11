import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PushPlatform } from '../../common/enums/platform.enum';

export class RegisterPushSubscriptionDto {
  @IsString()
  deviceId!: string;

  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsString()
  p256dh?: string;

  @IsOptional()
  @IsString()
  auth?: string;
}
