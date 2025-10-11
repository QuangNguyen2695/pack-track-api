import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateAuthRewardEventDto {
  @IsString()
  @IsNotEmpty()
  adEventId: string; // Google ad_event/transaction id (idempotency key)

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  adUnitId: string;

  @IsNumber()
  @Min(1)
  amount: number; // Số lượt thưởng

  @IsString()
  @IsOptional()
  rewardItem?: string; // Loại phần thưởng (ví dụ: "extra_quota")

  @IsOptional()
  raw?: any; // Raw payload từ Google AdMob để audit
}