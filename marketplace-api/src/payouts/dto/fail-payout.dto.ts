import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** US-49 — motif obligatoire à l'échec d'un payout (audit). */
export class FailPayoutDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}
