import { IsOptional, IsString } from 'class-validator';

export class UpsertTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  body!: string;
}
