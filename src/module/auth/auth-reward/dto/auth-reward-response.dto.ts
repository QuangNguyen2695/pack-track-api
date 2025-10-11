export class AuthRewardEventResponseDto {
  success: boolean;
  message: string;
  data?: {
    adEventId: string;
    quotaAdded: number;
    newTotalQuota?: number;
  };
}

export class UserDailyRewardStatsDto {
  userId: string;
  date: string; // YYYY-MM-DD format
  totalAdsWatched: number;
  totalQuotaEarned: number;
  dailyLimit: number;
  remainingAds: number;
}