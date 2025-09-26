import { IsDateString, IsEnum, IsInt, IsMongoId, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum PackStatus {
  RECORDED = 'recorded',
  UPLOADING = 'uploading',
  UPLOADED = 'uploaded',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  GCS = 'gcs',
  AZURE = 'azure',
}

export class CreatePackDto {
  @IsMongoId()
  userId: string;

  @IsString()
  @MaxLength(64)
  deviceId: string;

  @IsString()
  @MaxLength(64)
  packNumber: string; // số/lô/pack code bạn đặt

  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderCode?: string; // barcode/đơn hàng nếu có

  @IsDateString()
  createDate: string; // khi tạo record (client time or server time)

  @IsDateString()
  startRecordDate: string;

  @IsDateString()
  endRecordDate: string;

  @IsInt()
  @Min(0)
  timeRecordedMs: number; // tổng thời lượng (ms)

  // Video metadata (tùy giai đoạn upload)
  @IsOptional()
  @IsEnum(StorageProvider)
  videoStorage?: StorageProvider;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  videoStorageKey?: string; // ví dụ s3://bucket/key.mp4 hoặc path cục bộ

  @IsOptional()
  @IsString()
  @MaxLength(128)
  videoFileName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  videoFileSize?: number; // bytes

  @IsOptional()
  @IsString()
  @MaxLength(64)
  videoMimeType?: string; // video/mp4

  @IsOptional()
  @IsString()
  @MaxLength(32)
  videoResolution?: string; // 1920x1080

  @IsOptional()
  @IsString()
  @MaxLength(16)
  videoFrameRate?: string; // "30", "60"

  @IsOptional()
  @IsString()
  @MaxLength(128)
  videoChecksum?: string; // md5/sha256 để verify upload

  @IsOptional()
  @IsEnum(PackStatus)
  status?: PackStatus; // default recorded

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  notes?: string;

  @IsOptional()
  tags?: string[]; // nhãn tự do để lọc
}
