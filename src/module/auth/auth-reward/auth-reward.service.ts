import { Injectable, Logger, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { AuthRewardEvent, AuthRewardEventDocument } from './schemas/auth-reward-event.schema';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthRewardNonce, AuthRewardNonceDocument } from './schemas/auth-reward-nonce.schema';
import { UserSubscriptionUsageService } from '../../user-subscription-usage/user-subscription-usage.service';
import { UserDailyRewardStatsDto } from './dto/auth-reward-response.dto';

@Injectable()
export class AuthRewardService {
  private readonly logger = new Logger(AuthRewardService.name);
  private readonly rewardedAdUnitId: string;
  
  // Cấu hình giới hạn xem quảng cáo hàng ngày
  private readonly DAILY_AD_LIMIT = 10; // Tối đa 10 quảng cáo/ngày
  private readonly QUOTA_PER_AD = 1; // Mỗi quảng cáo = 1 lượt sử dụng

  constructor(
    @InjectModel(AuthRewardNonce.name) private readonly nonceModel: Model<AuthRewardNonceDocument>,
    @InjectModel(AuthRewardEvent.name) private readonly eventModel: Model<AuthRewardEventDocument>,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    @Inject(forwardRef(() => UserSubscriptionUsageService))
    private readonly userSubscriptionUsageService: UserSubscriptionUsageService,
  ) {
    this.rewardedAdUnitId = this.cfg.get<string>('AUTH_REWARDED_AD_UNIT_ID') || 'YOUR_REWARDED_AD_UNIT_ID';
  }

  /** Issue a one-time JWT nonce for SSV customData */
  async issueNonce(userId: string) {
    const jti = cryptoRandom();
    const payload = { sub: userId, jti, adUnitId: this.rewardedAdUnitId };
    const token = await this.jwt.signAsync(payload);

    await this.nonceModel.create({ jti, userId, adUnitId: this.rewardedAdUnitId, used: false });

    return { nonce: token };
  }

  /** Idempotently grant reward based on a verified SSV callback */
  async handleVerifiedSsv(params: {
    adEventId: string;
    userId: string;
    adUnitId: string;
    amount: number;
    rewardItem?: string;
    raw?: any;
    nonceJti: string;
  }) {
    const exists = await this.eventModel.exists({ adEventId: params.adEventId });
    if (exists) return { ok: true, duplicated: true };

    // Kiểm tra giới hạn xem quảng cáo hàng ngày
    const canWatch = await this.canWatchMoreAds(params.userId);
    if (!canWatch) {
      this.logger.warn(`User ${params.userId} reached daily ad limit`);
      return { ok: false, reason: 'DAILY_LIMIT_REACHED' };
    }

    const updated = await this.nonceModel.findOneAndUpdate(
      { jti: params.nonceJti, userId: params.userId, adUnitId: params.adUnitId, used: false },
      { $set: { used: true, usedAt: new Date() } },
    );
    if (!updated) return { ok: false, reason: 'BAD_NONCE' };

    await this.eventModel.create({
      adEventId: params.adEventId,
      userId: params.userId,
      adUnitId: params.adUnitId,
      amount: params.amount,
      rewardItem: params.rewardItem,
      raw: params.raw,
    });

    // Cộng thêm quota cho user
    try {
      const quotaAdded = params.amount * this.QUOTA_PER_AD;
      await this.addQuotaToUser(params.userId, quotaAdded, 'ad_reward');
      this.logger.log(`Granted reward: user=${params.userId} amount=${params.amount} quota=${quotaAdded}`);
    } catch (error) {
      this.logger.error(`Failed to add quota for user ${params.userId}:`, error);
      return { ok: false, reason: 'QUOTA_FAILED' };
    }

    return { ok: true };
  }

  /**
   * Cộng thêm quota cho user thông qua user-subscription-usage service
   */
  private async addQuotaToUser(userId: string, quotaAmount: number, source: string): Promise<void> {
    try {
      // Gọi method trong user-subscription-usage service để cộng thêm quota
      await this.userSubscriptionUsageService.addBonusQuota(
        new Types.ObjectId(userId),
        'pack', // module key
        'create', // function key
        quotaAmount,
        source,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Hết hạn sau 30 ngày
      );
    } catch (error) {
      throw new BadRequestException('Failed to add quota to user');
    }
  }

  /**
   * Lấy thống kê xem quảng cáo hàng ngày của user
   */
  async getDailyRewardStats(userId: string, date?: string): Promise<UserDailyRewardStatsDto> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Đếm số quảng cáo đã xem trong ngày
    const todayEvents = await this.eventModel.find({
      userId,
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });

    const totalAdsWatched = todayEvents.length;
    const totalQuotaEarned = todayEvents.reduce((sum, event) => sum + (event.amount * this.QUOTA_PER_AD), 0);

    return {
      userId,
      date: startOfDay.toISOString().split('T')[0], // YYYY-MM-DD format
      totalAdsWatched,
      totalQuotaEarned,
      dailyLimit: this.DAILY_AD_LIMIT,
      remainingAds: Math.max(0, this.DAILY_AD_LIMIT - totalAdsWatched),
    };
  }

  /**
   * Kiểm tra user có thể xem thêm quảng cáo không
   */
  async canWatchMoreAds(userId: string): Promise<boolean> {
    const stats = await this.getDailyRewardStats(userId);
    return stats.remainingAds > 0;
  }

  /**
   * Lấy lịch sử xem quảng cáo của user
   */
  async getUserRewardHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.eventModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.eventModel.countDocuments({ userId }),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

function cryptoRandom() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
