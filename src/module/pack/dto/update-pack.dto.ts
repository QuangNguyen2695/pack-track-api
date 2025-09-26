import { PartialType } from '@nestjs/mapped-types';
import { CreatePackDto, PackStatus, StorageProvider } from './create-pack.dto';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePackDto extends PartialType(CreatePackDto) {
  @IsOptional()
  @IsEnum(PackStatus)
  status?: PackStatus;

  @IsOptional()
  @IsEnum(StorageProvider)
  videoStorage?: StorageProvider;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  videoStorageKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  videoFileSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  videoChecksum?: string;
}
