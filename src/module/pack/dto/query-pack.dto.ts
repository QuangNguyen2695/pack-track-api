import { IsDateString, IsEnum, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PackStatus } from './create-pack.dto';
import { Type, Expose } from 'class-transformer';
import { PackDto } from './pack.dto';

export class SearchPackQuerySortFilter {
  key: string;
  value: string;
}

export class SearchPackQuery {
  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  pageIdx: number;

  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  pageSize: number;

  @IsOptional()
  @IsString()
  keyword: string;

  @IsOptional()
  sortBy: SearchPackQuerySortFilter;

  @IsOptional()
  filters: SearchPackQuerySortFilter[];
}

export class SearchPackRes {
  @Expose()
  pageIdx: number = 0;

  @Expose()
  packs: PackDto[];

  @Expose()
  totalPage: number = 0;

  @Expose()
  totalItem: number = 0;
}
