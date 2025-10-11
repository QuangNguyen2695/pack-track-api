# Hệ Thống Xem Quảng Cáo và Nhận Lượt Sử Dụng

## Tổng quan

Hệ thống này cho phép người dùng xem quảng cáo Google AdMob để nhận thêm lượt sử dụng (quota) cho các chức năng trong ứng dụng. Hệ thống được tích hợp với subscription system hiện có để quản lý và cộng thêm quota một cách tự động.

## Kiến trúc

### 1. Auth Reward System
- **AuthRewardEvent**: Lưu trữ lịch sử xem quảng cáo
- **AuthRewardNonce**: Quản lý JWT nonce cho bảo mật
- **AuthRewardService**: Logic xử lý phần thưởng
- **AuthRewardController**: API endpoints

### 2. User Subscription Usage Integration
- **addBonusQuota()**: Cộng thêm quota từ quảng cáo
- **getCurrentUsage()**: Lấy thông tin quota hiện tại
- Bonus tracking fields: lastBonusAt, bonusSource, bonusExpiresAt

## API Endpoints

### 1. Bắt đầu xem quảng cáo
```
POST /auth-reward/start
```
**Response:**
```json
{
  "nonce": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Callback từ Google AdMob (Server-to-Server Verification)
```
GET /auth-reward/ssv?ad_network=5450213213286189855&ad_unit=ca-app-pub-...
```

### 3. Lấy thống kê hàng ngày
```
GET /auth-reward/daily-stats?date=2025-10-05
```
**Response:**
```json
{
  "userId": "670123456789abcd",
  "date": "2025-10-05",
  "totalAdsWatched": 3,
  "totalQuotaEarned": 3,
  "dailyLimit": 10,
  "remainingAds": 7
}
```

### 4. Kiểm tra có thể xem thêm quảng cáo
```
GET /auth-reward/can-watch
```
**Response:**
```json
{
  "canWatch": true,
  "remainingAds": 7
}
```

### 5. Lịch sử xem quảng cáo
```
GET /auth-reward/history?page=1&limit=20
```
**Response:**
```json
{
  "events": [
    {
      "_id": "670123456789abcd",
      "adEventId": "ad_event_12345",
      "userId": "670123456789abcd",
      "adUnitId": "ca-app-pub-...",
      "amount": 1,
      "rewardItem": "extra_quota",
      "createdAt": "2025-10-05T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

## Cấu hình

### Environment Variables
```bash
# JWT secret cho auth reward system
AUTH_REWARD_JWT_SECRET=your-secret-key

# Google AdMob Rewarded Ad Unit ID
AUTH_REWARDED_AD_UNIT_ID=ca-app-pub-xxxxx/xxxxx
```

### Cấu hình trong Service
```typescript
// Giới hạn xem quảng cáo hàng ngày
private readonly DAILY_AD_LIMIT = 10;

// Số lượt thưởng mỗi quảng cáo
private readonly QUOTA_PER_AD = 1;
```

## Quy trình hoạt động

### 1. Client Side (Mobile App)
```kotlin
// 1. Lấy nonce từ server
val response = api.startRewardAd()
val nonce = response.nonce

// 2. Load quảng cáo với custom data
val rewardedAd = RewardedAd.load(context, adUnitId) { ad ->
    // 3. Hiển thị quảng cáo
    ad.show(activity) { rewardItem ->
        // 4. Server sẽ tự động nhận callback từ Google
        // và cộng quota cho user
    }
}

// Set server-side verification
val serverSideVerificationOptions = ServerSideVerificationOptions.Builder()
    .setCustomData(nonce)  // Nonce từ step 1
    .build()
rewardedAd.setServerSideVerificationOptions(serverSideVerificationOptions)
```

### 2. Server Side Flow
1. Client gọi `/auth-reward/start` → Server tạo nonce (JWT)
2. Client load quảng cáo với nonce trong customData
3. User xem quảng cáo thành công
4. Google gọi SSV callback đến `/auth-reward/ssv`
5. Server verify signature và nonce
6. Server lưu event và cộng quota cho user
7. Client có thể gọi APIs khác để check stats

## Database Schema

### AuthRewardEvent Collection
```javascript
{
  _id: ObjectId,
  adEventId: String,     // Google ad_event/transaction id (unique)
  userId: String,        // User ID
  adUnitId: String,      // Ad unit ID từ Google
  amount: Number,        // Số lượng thưởng
  rewardItem: String,    // Loại phần thưởng ("extra_quota")
  raw: Object,          // Raw data từ Google (audit)
  createdAt: Date
}
```

### UserSubscriptionUsage Collection (Updated)
```javascript
{
  // ... existing fields ...
  
  // Bonus tracking fields
  lastBonusAt: Date,      // Lần cuối nhận bonus
  bonusSource: String,    // Nguồn bonus ("ad_reward")
  bonusExpiresAt: Date    // Ngày hết hạn bonus
}
```

## Bảo mật

1. **Idempotency**: Mỗi adEventId chỉ được xử lý 1 lần
2. **JWT Nonce**: One-time token để verify từ client
3. **Google SSV**: Server-side verification từ Google
4. **Daily Limit**: Giới hạn số quảng cáo/ngày
5. **Signature Verification**: Verify chữ ký từ Google

## Monitoring và Logging

- Log mỗi lần user nhận thưởng thành công
- Track daily stats để phân tích
- Monitor SSV callback failures
- Alert khi có unusual patterns

## Tích hợp với Client

Để tích hợp vào app hiện tại:

1. **Import module** vào AppModule:
```typescript
@Module({
  imports: [
    // ... other modules
    AuthRewardModule,
  ],
})
export class AppModule {}
```

2. **Thêm middleware authentication** cho các protected endpoints

3. **Frontend integration** với Google Mobile Ads SDK

4. **Setup SSV URL** trong Google AdMob console:
```
https://your-domain.com/auth-reward/ssv
```

## Testing

### Manual Testing
1. Tạo test ad unit trong AdMob
2. Gọi `/auth-reward/start` để lấy nonce
3. Simulate SSV callback với test parameters
4. Verify quota được cộng đúng

### Unit Tests
- Test daily limit enforcement
- Test duplicate event prevention
- Test quota calculation
- Test JWT nonce verification