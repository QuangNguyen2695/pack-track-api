import { IsBooleanString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class QueryDeviceDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string; // 'true'|'false'

  @IsOptional()
  @IsString()
  search?: string; // model/appVersion/osVersion substring

  @IsOptional()
  @IsString()
  page?: string; // default 1

  @IsOptional()
  @IsString()
  limit?: string; // default 20
}
