import { IsString, Length } from 'class-validator';

export class ActivateSellerDto {
  @IsString() @Length(32, 256) token: string;
  @IsString() @Length(8, 100) password: string;
}
