import { Exclude, Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsInt, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UserAddressDto {
  @Expose()
  _id: Types.ObjectId;

  @Expose()
  addressType: string;

  @Expose()
  address: string;

  @Expose()
  isDefault: boolean;
}

export class UserDto {
  @Expose()
  _id: Types.ObjectId;

  @Expose()
  subscriptionId: Types.ObjectId;

  @Expose()
  avatar: string;

  @Expose()
  avatarId: string;

  @Expose()
  password: string;

  @Expose()
  name: string;

  @Expose()
  addresses?: UserAddressDto[];

  @Expose()
  gender: string;

  @Expose()
  email: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  birthdate?: Date;

  @Expose()
  role: string;

  @Expose()
  isEmailVerified: boolean;

  @Expose()
  isPhoneNumberVerified: boolean;

  @Expose()
  isLocked: boolean;

  @Exclude()
  resetTokenVersion: number;

  @Exclude()
  isDeleted: boolean;

  @Exclude()
  createdAt: Date;

  @Exclude()
  isTempPassWord: boolean;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  __v: number;
}

export class SearchUsersTypesQuery {
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
  sortBy: {
    key: string;
    value: string;
  };

  @IsOptional()
  filters: {
    key: string;
    value: string[];
  };
}

export class SearchUsersRes {
  pageIdx: number = 0;
  users: UserDto[];
  totalPage: number = 0;
  totalItem: number = 0;
}
