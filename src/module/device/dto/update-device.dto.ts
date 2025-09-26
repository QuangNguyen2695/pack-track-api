import { PartialType } from '@nestjs/mapped-types';
import { CreateDeviceDto } from './create-device.dto';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  pushToken?: string;

  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;
}
