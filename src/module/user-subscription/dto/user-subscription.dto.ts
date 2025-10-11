import {
  IsMongoId,
  IsOptional,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { SubscriptionLimitationDto } from '../../subscription/dto/subscription.dto';
import { Types } from 'mongoose';
import { Expose, Exclude, Type } from 'class-transformer';
import { OmitType } from '@nestjs/mapped-types';

export class UserSubscriptionDto {
  @Expose()
  _id: Types.ObjectId;

  @Expose()
  userId: Types.ObjectId;

  @Expose()
  subscriptionId: Types.ObjectId;

  @Expose()
  name: string;

  @Expose()
  price: number;

  @Expose()
  duration: number; // cùng đơn vị với durationUnit

  @Expose()
  durationUnit: 'month' | 'day';

  @Expose()
  startAt: Date;

  @Expose()
  endAt: Date;

  @Expose()
  status: 'active' | 'canceled' | 'expired';

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  __v: number;
}

export class RegisterSubscriptionDto {
  @IsMongoId()
  subscriptionId: string;

  @IsOptional()
  @IsDateString()
  startAt?: string; // ISO; mặc định now

  @IsOptional()
  @IsIn(['month', 'day', 'year', 'lifetime'])
  durationUnit?: 'month' | 'day' | 'year' | 'lifetime'; // mặc định month (theo plan)

  @IsOptional()
  @IsInt()
  @Min(0)
  durationOverride?: number; // override duration của plan

  @IsOptional()
  @IsBoolean()
  replaceCurrent?: boolean; // true = hủy active hiện tại và thay thế
}

export class RegisterSubscriptionByCodeDto extends OmitType(RegisterSubscriptionDto, ['subscriptionId'] as const) {
  @IsString()
  @IsNotEmpty()
  code: string; // Mã code của gói subscription
}

export class SearchUserSubscriptionQuerySortFilter {
  key: string;
  value: string;
}

export class SearchUserSubscriptionQuery {
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
  sortBy: SearchUserSubscriptionQuerySortFilter;

  @IsOptional()
  filters: SearchUserSubscriptionQuerySortFilter[];
}

export class SearchUserSubscriptionRes {
  pageIdx: number = 0;
  UserSubscriptions: UserSubscriptionDto[];
  totalPage: number = 0;
  totalItem: number = 0;
}
