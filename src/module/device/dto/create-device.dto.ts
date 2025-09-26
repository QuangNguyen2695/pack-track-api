import { IsBoolean, IsEnum, IsMongoId, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export class CreateDeviceDto {
  @IsMongoId()
  userId: string;

  deviceId: string; // UUID sinh từ native layer (device unique id)

  @IsString()
  installationId: string; // id phiên cài đặt app (có thể khác deviceId sau khi cài lại)

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsString()
  appVersion: string;

  @IsString()
  osVersion: string;

  @IsString()
  modelDevice: string;

  @IsString()
  manufacturer: string;

  @IsOptional()
  @IsString()
  pushToken?: string; // FCM/APNs

  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
