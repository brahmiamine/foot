import { IsString, MinLength } from 'class-validator';

export class TransitionTemplateDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
