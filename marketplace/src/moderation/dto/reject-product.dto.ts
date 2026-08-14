import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectProductDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  actorId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  rejectionReason: string;
}
