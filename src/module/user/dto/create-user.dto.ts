import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  Matches,
  IsBoolean,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateUserAddressDto {
  addressType: string;
  address: string;
  isDefault: boolean;
}

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  avatarId: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  addresses?: CreateUserAddressDto[];

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'], {
    message: 'Giới tính phải là male, female hoặc other.',
  })
  gender: string;

  @IsOptional()
  @IsDateString()
  birthdate?: string; // Sử dụng ISO String cho ngày tháng

  @IsNotEmpty()
  @IsBoolean()
  isTempPassWord: boolean; // Sử dụng ISO String cho ngày tháng

  resetTokenVersion: number;
}
