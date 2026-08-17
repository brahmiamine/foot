import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSellerApplicationDto {
  @IsString() @MaxLength(191) actorId: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}
