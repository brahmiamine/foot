import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class SellerApplicationDocumentDto {
  @IsString() @Length(1, 120) label: string;
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  url: string;
}

export class CreateSellerApplicationDto {
  @IsString() @Length(1, 36) clubId: string;
  @IsString() @Length(2, 191) businessName: string;
  @IsString() @Length(2, 191) ownerName: string;
  @IsEmail() @MaxLength(191) email: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(120) activityCategory?: string;
  @IsOptional() @IsString() @MaxLength(120) taxId?: string;
  @IsOptional() @IsString() @MaxLength(120) tradeRegister?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SellerApplicationDocumentDto)
  documents?: SellerApplicationDocumentDto[];
}
