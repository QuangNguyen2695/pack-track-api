// Example: Tích hợp AuthRewardModule vào ứng dụng chính

// 1. Import vào AppModule
// import { Module } from '@nestjs/common';
// import { AuthRewardModule } from './module/auth/auth-reward/auth-reward.module';
// import { UserSubscriptionUsageModule } from './module/user-subscription-usage/user-subscription-usage.module';

// @Module({
//   imports: [
//     // ... other modules
//     UserSubscriptionUsageModule,
//     AuthRewardModule,  // Đảm bảo UserSubscriptionUsageModule được import trước
//     // ... other modules
//   ],
// })
// export class AppModule {}

// 2. Environment variables cần thiết (.env)
/*
AUTH_REWARD_JWT_SECRET=your-very-secure-secret-key-for-ad-rewards
AUTH_REWARDED_AD_UNIT_ID=ca-app-pub-1234567890123456/1234567890
*/

// 3. Frontend integration example (React Native/Flutter)
/*
// Step 1: Call start endpoint
const response = await fetch('/auth-reward/start', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + userToken }
});
const { nonce } = await response.json();

// Step 2: Load rewarded ad with nonce
// (Implementation depends on Google Mobile Ads SDK)

// Step 3: Check if user can watch more ads
const canWatchResponse = await fetch('/auth-reward/can-watch', {
  headers: { Authorization: 'Bearer ' + userToken }
});
const { canWatch, remainingAds } = await canWatchResponse.json();

// Step 4: Get daily stats
const statsResponse = await fetch('/auth-reward/daily-stats', {
  headers: { Authorization: 'Bearer ' + userToken }
});
const dailyStats = await statsResponse.json();

console.log('Daily stats:', dailyStats);
// Output: { userId: "...", date: "2025-10-05", totalAdsWatched: 3, totalQuotaEarned: 3, dailyLimit: 10, remainingAds: 7 }
*/

// 4. Server-side testing example
/*
// Test SSV callback manually
curl -X GET "http://localhost:3000/auth-reward/ssv?ad_network=5450213213286189855&ad_unit=ca-app-pub-test&reward_amount=1&reward_item=extra_quota&transaction_id=test_12345&timestamp=1696521600&custom_data=JWT_NONCE_HERE&signature=GOOGLE_SIGNATURE"
*/