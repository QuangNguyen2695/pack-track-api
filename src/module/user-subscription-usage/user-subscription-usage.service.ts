import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserSubscriptionUsageDocument } from './schema/user-subscription-usage.schema';
import { SubscriptionDocument } from '../subscription/schema/subscription.schema';
import { UserSubscriptionDocument } from '../user-subscription/schema/user-subscription.schema';
import { eqObjectId } from '@/utils/utils';

// Import type từ billing.dto.ts
type CapabilityItem = {
  moduleKey: string;
  functionKey: string | null;
  type: 'unlimited' | 'count';
  quota: number | null;
  baseQuota?: number | null;
  bonusQuota?: number | null;
  remaining: number | null;
  resetAt: string | null;
};

type ConsumeParams = {
  subscriptionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  moduleKey: string;
  functionKey?: string | null;
};

@Injectable()
export class UserSubscriptionUsageService {
  constructor(
    @InjectModel(UserSubscriptionDocument.name) private readonly userSubModel: Model<UserSubscriptionDocument>,
    @InjectModel(UserSubscriptionUsageDocument.name)
    private readonly usageModel: Model<UserSubscriptionUsageDocument>,
  ) {}

  private getWindow(now: Date, unit: string, size = 1) {
    const s = new Date(now),
      e = new Date(now);
    switch (unit) {
      case 'minute':
        s.setSeconds(0, 0);
        e.setSeconds(0, 0);
        e.setMinutes(e.getMinutes() + size);
        break;
      case 'hour':
        s.setMinutes(0, 0, 0);
        e.setMinutes(0, 0, 0);
        e.setHours(e.getHours() + size);
        break;
      case 'day':
        s.setHours(0, 0, 0, 0);
        e.setHours(0, 0, 0, 0);
        e.setDate(e.getDate() + size);
        break;
      case 'week': {
        const d = s.getDay(),
          m = (d + 6) % 7;
        s.setHours(0, 0, 0, 0);
        s.setDate(s.getDate() - m);
        e.setHours(0, 0, 0, 0);
        e.setDate(s.getDate() + 7 * size);
        break;
      }
      case 'month':
        s.setDate(1);
        s.setHours(0, 0, 0, 0);
        e.setDate(1);
        e.setHours(0, 0, 0, 0);
        e.setMonth(e.getMonth() + size);
        break;
      case 'lifetime':
        return { start: new Date(0), end: new Date(8640000000000000) };
      default:
        throw new Error('Unsupported window unit');
    }
    return { start: s, end: e };
  }

  private resolveRule(subscription: any, moduleKey: string, functionKey?: string | null) {
    const lim = subscription?.limitationSnapshot;
    const mod = lim?.modules?.find((m: any) => m.key === moduleKey);
    if (!mod) return null;

    if (functionKey) {
      const fn = mod.functions?.find((f: any) => f.key === functionKey);
      if (fn) return fn;
      if (mod.moduleRule) return mod.moduleRule;
      return null;
    }
    return mod.moduleRule ?? null; // module-level
  }

  async checkAndConsume(params: ConsumeParams) {
    const moduleKey = params.moduleKey.toLowerCase().trim();
    const functionKey = params.functionKey ? params.functionKey.toLowerCase().trim() : null;

    const sub = await this.userSubModel.findOne({ subscriptionId: params.subscriptionId }).exec();
    if (!sub) return { allowed: false, reason: 'subscription_not_found' };

    const rule = this.resolveRule(sub, moduleKey, functionKey);
    if (!rule) {
      const def = sub.limitationSnapshot?.defaultAction ?? 'block';
      return def === 'allow' ? { allowed: true } : { allowed: false, reason: 'no_rule' };
    }
    if (rule.type === 'unlimited') return { allowed: true };

    const now = new Date();
    const { start, end } = this.getWindow(now, rule.windowUnit ?? 'month', rule.windowSize ?? 1);

    const filter = {
      subscriptionId: params.subscriptionId,
      subjectId: params.subjectId,
      moduleKey,
      functionKey, // null = module-level
      windowStart: start,
      windowEnd: end,
    };

    // Kiểm tra xem đã có usage record chưa
    const existingUsage = await this.usageModel.findOne(filter).exec();
    
    let totalQuota = rule.quota ?? 0;
    
    if (existingUsage) {
      // Nếu đã có record, sử dụng quota hiện tại (có thể đã được cộng bonus)
      totalQuota = existingUsage.quota ?? 0;
      
      // Kiểm tra xem còn quota không
      if (existingUsage.used >= totalQuota) {
        return { allowed: false, reason: 'quota_exceeded', remaining: 0, resetAt: end };
      }
      
      // Tăng used và return
      const updated = await this.usageModel
        .findOneAndUpdate(
          { ...filter, _id: existingUsage._id },
          { $inc: { used: 1 } },
          { new: true }
        )
        .exec();
      
      if (updated) {
        const remaining = Math.max(0, updated.quota - updated.used);
        return { allowed: true, remaining, resetAt: end, quotaSource: 'existing' };
      }
    }

    // Nếu chưa có record, tạo mới với quota gốc
    if (totalQuota < 1) return { allowed: false, reason: 'quota_zero' };

    try {
      const created = await this.usageModel.create({
        ...filter,
        windowType: rule.windowType ?? 'calendar',
        windowUnit: rule.windowUnit ?? 'month',
        windowSize: rule.windowSize ?? 1,
        used: 1,
        quota: totalQuota,
      });
      const remaining = Math.max(0, created.quota - created.used);
      return { allowed: true, remaining, resetAt: end, quotaSource: 'new' };
    } catch (e: any) {
      if (e?.code === 11000) {
        // Xử lý race condition - thử update lại
        const retry = await this.usageModel
          .findOneAndUpdate(
            { ...filter, $expr: { $lt: ['$used', '$quota'] } },
            { $inc: { used: 1 } },
            { new: true }
          )
          .exec();
        if (retry) {
          const remaining = Math.max(0, retry.quota - retry.used);
          return { allowed: true, remaining, resetAt: end, quotaSource: 'retry' };
        }
      }
      return { allowed: false, reason: 'quota_exceeded' };
    }
  }

  async buildCapabilities(subscriptionIdRaw: any, subjectIdRaw: any) {
    const subscriptionId = new Types.ObjectId(subscriptionIdRaw);
    const subjectId = new Types.ObjectId(subjectIdRaw);

    const isRootMatch = eqObjectId(subjectId, process.env.ROOT_TENANT_ID);

    if (isRootMatch) {
      return { defaultAction: 'allow', items: [] as CapabilityItem[] };
    }

    const sub = await this.userSubModel.findOne({ subscriptionId: subscriptionId }).lean().exec();
    if (!sub) return { defaultAction: 'block', items: [] as CapabilityItem[] };

    const items: CapabilityItem[] = [];
    const now = new Date();

    for (const m of sub.limitationSnapshot?.modules ?? []) {
      // module-level rule
      if (m.moduleRule) {
        const { windowUnit = 'month', windowSize = 1, type = 'count', quota = 0 } = m.moduleRule;
        const { start, end } = this.getWindow(now, windowUnit, windowSize);
        let remaining: number | null = null;
        let actualQuota = quota ?? 0;
        if (type === 'count') {
          const usage = await this.usageModel
            .findOne({
              subscriptionId,
              subjectId,
              moduleKey: m.key,
              functionKey: null,
              windowStart: start,
              windowEnd: end,
            })
            .lean()
            .exec();
          const used = usage?.used ?? 0;
          // Sử dụng quota thực tế (có thể đã có bonus) thay vì quota gốc
          actualQuota = usage?.quota ?? (quota ?? 0);
          remaining = Math.max(0, actualQuota - used);
        }
        items.push({
          moduleKey: m.key,
          functionKey: null,
          type,
          quota: type === 'unlimited' ? null : actualQuota,
          baseQuota: type === 'unlimited' ? null : (quota ?? 0),
          bonusQuota: type === 'unlimited' ? null : Math.max(0, actualQuota - (quota ?? 0)),
          remaining: type === 'unlimited' ? null : remaining,
          resetAt: type === 'unlimited' ? null : end.toISOString(),
        });
      }
      // function-level rules
      for (const f of m.functions ?? []) {
        const { windowUnit = 'month', windowSize = 1, type = 'count', quota = 0 } = f;
        const { start, end } = this.getWindow(now, windowUnit, windowSize);
        let remaining: number | null = null;
        let actualQuota = quota ?? 0;
        if (type === 'count') {
          const usage = await this.usageModel
            .findOne({
              subscriptionId,
              subjectId,
              moduleKey: m.key,
              functionKey: f.key,
              windowStart: start,
              windowEnd: end,
            })
            .lean()
            .exec();
          const used = usage?.used ?? 0;
          // Sử dụng quota thực tế (có thể đã có bonus) thay vì quota gốc
          actualQuota = usage?.quota ?? (quota ?? 0);
          remaining = Math.max(0, actualQuota - used);
        }
        items.push({
          moduleKey: m.key,
          functionKey: f.key,
          type,
          quota: type === 'unlimited' ? null : actualQuota,
          baseQuota: type === 'unlimited' ? null : (quota ?? 0),
          bonusQuota: type === 'unlimited' ? null : Math.max(0, actualQuota - (quota ?? 0)),
          remaining: type === 'unlimited' ? null : remaining,
          resetAt: type === 'unlimited' ? null : end.toISOString(),
        });
      }
    }

    return {
      defaultAction: sub.limitationSnapshot?.defaultAction ?? 'block',
      items,
    };
  }

  async addUsageForPeriod(params: {
    subscriptionId: Types.ObjectId;
    subjectId: Types.ObjectId;
    moduleKey: string;
    functionKey?: string | null;
    period: 'day' | 'month' | 'year';
    at?: Date; // mặc định = now
    amount?: number; // mặc định = 1
  }) {
    const { subscriptionId, subjectId, moduleKey, functionKey = null, period, at = new Date(), amount = 1 } = params;

    const modKey = moduleKey.toLowerCase().trim();
    const fnKey = functionKey ? functionKey.toLowerCase().trim() : null;

    // Lấy subscription snapshot để cố gắng điền quota (nếu có rule)
    const sub = await this.userSubModel.findOne({ subscriptionId }).lean();
    if (!sub) {
      throw new Error('subscription_not_found');
    }

    // Tìm rule (nếu có) để lấy quota cho doc mới
    const rule = this.resolveRule(sub as any, modKey, fnKey ?? undefined);
    const inferredQuota = rule?.type === 'count' && typeof rule?.quota === 'number' ? rule!.quota : 0;

    // Cửa sổ calendar cho period yêu cầu
    const { start, end } = this.getWindow(at, period, 1);

    const filter = {
      subscriptionId,
      subjectId,
      moduleKey: modKey,
      functionKey: fnKey, // null = module-level
      windowStart: start,
      windowEnd: end,
    };

    // Upsert: nếu có doc -> chỉ cộng used; nếu chưa có -> tạo mới và set quota, window meta
    const doc = await this.usageModel
      .findOneAndUpdate(
        filter,
        {
          $inc: { used: amount },
          $setOnInsert: {
            windowType: 'calendar',
            windowUnit: period,
            windowSize: 1,
            quota: inferredQuota,
          },
        },
        { new: true, upsert: true },
      )
      .lean();

    return {
      ok: true,
      moduleKey: modKey,
      functionKey: fnKey,
      period,
      windowStart: doc.windowStart,
      windowEnd: doc.windowEnd,
      used: doc.used,
      quota: doc.quota ?? 0,
    };
  }

  /**
   * Cộng thêm quota bonus cho user (từ xem quảng cáo, khuyến mãi, etc.)
   */
  async addBonusQuota(
    userId: Types.ObjectId,
    moduleKey: string,
    functionKey: string | null,
    bonusAmount: number,
    source: string = 'bonus',
    expiresAt?: Date
  ) {
    const modKey = moduleKey.toLowerCase().trim();
    const fnKey = functionKey ? functionKey.toLowerCase().trim() : null;

    // Tìm active user subscription
    const userSub = await this.userSubModel.findOne({
      userId,
      status: 'active',
      startAt: { $lte: new Date() },
      endAt: { $gte: new Date() }
    }).lean();

    if (!userSub) {
      throw new Error('No active subscription found for user');
    }

    // Tạo window cho tháng hiện tại (để bonus quota theo chu kỳ tháng)
    const now = new Date();
    const { start: windowStart, end: windowEnd } = this.getWindow(now, 'month', 1);

    const filter = {
      subscriptionId: userSub._id,
      subjectId: userId,
      moduleKey: modKey,
      functionKey: fnKey,
      windowStart,
      windowEnd,
    };

    // Tìm hoặc tạo usage record cho tháng hiện tại
    const doc = await this.usageModel.findOneAndUpdate(
      filter,
      {
        $inc: { quota: bonusAmount }, // Cộng thêm quota
        $setOnInsert: {
          windowType: 'calendar',
          windowUnit: 'month',
          windowSize: 1,
          used: 0,
        },
        $set: {
          // Metadata về bonus
          lastBonusAt: new Date(),
          bonusSource: source,
          ...(expiresAt && { bonusExpiresAt: expiresAt })
        }
      },
      { new: true, upsert: true }
    );

    return {
      success: true,
      userId: userId.toString(),
      moduleKey: modKey,
      functionKey: fnKey,
      bonusAdded: bonusAmount,
      newQuota: doc.quota,
      used: doc.used,
      remaining: Math.max(0, doc.quota - doc.used),
      window: {
        start: doc.windowStart,
        end: doc.windowEnd
      }
    };
  }

  /**
   * Lấy thông tin usage hiện tại của user cho module/function cụ thể
   */
  async getCurrentUsage(userId: Types.ObjectId, moduleKey: string, functionKey?: string | null) {
    const modKey = moduleKey.toLowerCase().trim();
    const fnKey = functionKey ? functionKey.toLowerCase().trim() : null;

    // Tìm active user subscription
    const userSub = await this.userSubModel.findOne({
      userId,
      status: 'active',
      startAt: { $lte: new Date() },
      endAt: { $gte: new Date() }
    }).lean();

    if (!userSub) {
      return null;
    }

    // Lấy quota gốc từ rule
    const rule = this.resolveRule(userSub as any, modKey, fnKey ?? undefined);
    const baseQuota = rule?.quota ?? 0;

    // Tạo window cho tháng hiện tại
    const now = new Date();
    const { start: windowStart, end: windowEnd } = this.getWindow(now, 'month', 1);

    const usage = await this.usageModel.findOne({
      subscriptionId: userSub._id,
      subjectId: userId,
      moduleKey: modKey,
      functionKey: fnKey,
      windowStart,
      windowEnd,
    }).lean();

    if (!usage) {
      return {
        quota: baseQuota,
        baseQuota: baseQuota,
        bonusQuota: 0,
        used: 0,
        remainingQuota: baseQuota,
        window: { start: windowStart, end: windowEnd }
      };
    }

    const totalQuota = usage.quota || 0;
    const bonusQuota = Math.max(0, totalQuota - baseQuota);

    return {
      quota: totalQuota,
      baseQuota: baseQuota,
      bonusQuota: bonusQuota,
      used: usage.used || 0,
      remainingQuota: Math.max(0, totalQuota - (usage.used || 0)),
      window: {
        start: usage.windowStart,
        end: usage.windowEnd
      },
      lastBonusAt: usage.lastBonusAt,
      bonusSource: usage.bonusSource,
      bonusExpiresAt: usage.bonusExpiresAt
    };
  }

  /**
   * Lấy quota breakdown chi tiết cho user
   */
  async getQuotaBreakdown(userId: Types.ObjectId, moduleKey: string, functionKey?: string | null) {
    const usage = await this.getCurrentUsage(userId, moduleKey, functionKey);
    
    if (!usage) {
      return {
        hasActiveSubscription: false,
        totalQuota: 0,
        breakdown: {
          baseQuota: 0,
          bonusQuota: 0,
          used: 0,
          remaining: 0
        }
      };
    }

    return {
      hasActiveSubscription: true,
      totalQuota: usage.quota,
      breakdown: {
        baseQuota: usage.baseQuota,
        bonusQuota: usage.bonusQuota,
        used: usage.used,
        remaining: usage.remainingQuota
      },
      window: usage.window,
      bonusInfo: {
        lastBonusAt: usage.lastBonusAt,
        bonusSource: usage.bonusSource,
        bonusExpiresAt: usage.bonusExpiresAt
      }
    };
  }

  /**
   * Dọn dẹp quota bonus đã hết hạn
   */
  async cleanupExpiredBonusQuota() {
    const now = new Date();
    
    // Tìm tất cả usage records có bonus đã hết hạn
    const expiredRecords = await this.usageModel.find({
      bonusExpiresAt: { $lt: now },
      bonusSource: { $exists: true }
    }).exec();

    let cleanedCount = 0;

    for (const record of expiredRecords) {
      // Lấy subscription để tính quota gốc
      const sub = await this.userSubModel.findOne({ _id: record.subscriptionId }).lean();
      if (!sub) continue;

      const rule = this.resolveRule(sub as any, record.moduleKey, record.functionKey ?? undefined);
      const baseQuota = rule?.quota ?? 0;

      // Reset quota về base quota
      await this.usageModel.updateOne(
        { _id: record._id },
        {
          $set: {
            quota: baseQuota
          },
          $unset: {
            bonusExpiresAt: 1,
            bonusSource: 1,
            lastBonusAt: 1
          }
        }
      );

      cleanedCount++;
    }

    return {
      cleanedCount,
      message: `Cleaned up ${cleanedCount} expired bonus quota records`
    };
  }

  /**
   * Thống kê bonus quota của user
   */
  async getUserBonusStats(userId: Types.ObjectId) {
    const userSub = await this.userSubModel.findOne({
      userId,
      status: 'active',
      startAt: { $lte: new Date() },
      endAt: { $gte: new Date() }
    }).lean();

    if (!userSub) {
      return {
        hasActiveSubscription: false,
        totalBonusQuota: 0,
        activeBonus: []
      };
    }

    const now = new Date();
    const { start: windowStart, end: windowEnd } = this.getWindow(now, 'month', 1);

    const bonusRecords = await this.usageModel.find({
      subscriptionId: userSub._id,
      subjectId: userId,
      windowStart,
      windowEnd,
      bonusSource: { $exists: true }
    }).lean();

    const activeBonus = bonusRecords.map(record => {
      const rule = this.resolveRule(userSub as any, record.moduleKey, record.functionKey ?? undefined);
      const baseQuota = rule?.quota ?? 0;
      const bonusQuota = Math.max(0, record.quota - baseQuota);

      return {
        moduleKey: record.moduleKey,
        functionKey: record.functionKey,
        bonusQuota,
        bonusSource: record.bonusSource,
        lastBonusAt: record.lastBonusAt,
        bonusExpiresAt: record.bonusExpiresAt,
        isExpired: record.bonusExpiresAt ? record.bonusExpiresAt < now : false
      };
    });

    const totalBonusQuota = activeBonus.reduce((sum, bonus) => sum + bonus.bonusQuota, 0);

    return {
      hasActiveSubscription: true,
      totalBonusQuota,
      activeBonus
    };
  }
}
