import { Exclude, Expose, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class FunctionRuleDto {
  @Expose()
  readonly key: string;

  @Expose()
  readonly type: 'count' | 'unlimited';

  @Expose()
  readonly quota?: number;

  @Expose()
  readonly windowType?: 'calendar' | 'rolling';

  @Expose()
  readonly windowUnit?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'lifetime';

  @Expose()
  readonly windowSize?: number;

  @Expose()
  readonly burst?: number;

  @Expose()
  readonly concurrency?: number;
}

export class ModuleRuleDto {
  @Expose()
  readonly key: string;

  @Expose()
  @Type(() => FunctionRuleDto)
  readonly moduleRule?: FunctionRuleDto;

  @Expose()
  @Type(() => FunctionRuleDto)
  readonly functions: FunctionRuleDto[];
}

export class SubscriptionLimitationDto {
  @Expose()
  readonly defaultAction: 'allow' | 'block';

  @Expose()
  @Type(() => ModuleRuleDto)
  readonly modules: ModuleRuleDto[];
}

export class SubscriptionDto {
  @Expose()
  readonly _id: Types.ObjectId;

  @Expose()
  readonly name: string;

  @Expose()
  readonly code: string;

  @Expose()
  readonly price: number;

  @Expose()
  readonly description: string;

  @Expose()
  readonly duration: number;

  @Expose()
  readonly durationUnit: 'month' | 'week' | 'day' | 'year' | 'lifetime';

  @Expose()
  @Type(() => SubscriptionLimitationDto)
  readonly limitation: SubscriptionLimitationDto;

  @Expose()
  readonly status: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  __v: number;
}

export class SearchSubscriptionQuerySortFilter {
  @IsOptional()
  key: string;

  @IsOptional()
  value: string;
}

export class SearchSubscriptionQuery {
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
  sortBy: SearchSubscriptionQuerySortFilter;

  @IsOptional()
  filters: SearchSubscriptionQuerySortFilter[];
}

export class SearchSubscriptionsRes {
  pageIdx: number = 0;
  subscriptions: SubscriptionDto[];
  totalPage: number = 0;
  totalItem: number = 0;
}
