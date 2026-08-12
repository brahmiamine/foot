import { IsInt, IsOptional, Min } from 'class-validator';

export class SetAvailableStockDto {
  @IsInt()
  @Min(0)
  available: number;

  /**
   * Optionnel : absent du body = seuil inchangé, `null` explicite = seuil
   * supprimé (plus d'alerte), nombre = nouveau seuil.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number | null;
}
