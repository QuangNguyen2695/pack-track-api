import { DeviceDto } from '@/module/device/dto/device.dto';
import { Exclude, Expose } from 'class-transformer';
import { Types } from 'mongoose';

export class PackDto {
  @Expose() _id: Types.ObjectId;
  @Expose() userId: Types.ObjectId;

  @Expose() deviceId: string;
  @Expose() device: DeviceDto;
  @Expose() packNumber: string;
  @Expose() orderCode?: string;

  @Expose() createDate: Date;
  @Expose() startRecordDate: Date;
  @Expose() endRecordDate: Date;
  @Expose() timeRecordedMs: number;

  @Expose() status: string;

  @Expose() videoStorage?: string;
  @Expose() videoStorageKey?: string;
  @Expose() videoFileName?: string;
  @Expose() videoFileSize?: number;
  @Expose() videoMimeType?: string;
  @Expose() videoResolution?: string;
  @Expose() videoFrameRate?: string;
  @Expose() videoChecksum?: string;

  @Expose() appVersion?: string;
  @Expose() ip?: string;

  @Expose() tags?: string[];
  @Expose() notes?: string;

  @Expose() lastAccessAt?: Date;
  @Expose() createdAt: Date;

  @Exclude() updatedAt: Date;
  @Exclude() deletedAt?: Date | null;
  pack: import('mongoose').FlattenMaps<
    import('e:/Project/PackTrack-API/src/module/device/schema/device.schema').Device
  > &
    Required<{ _id: import('mongoose').FlattenMaps<unknown> }> & { __v: number };
}
