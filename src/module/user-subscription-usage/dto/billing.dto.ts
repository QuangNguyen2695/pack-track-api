type CapabilityItem = {
  moduleKey: string;
  functionKey: string | null; // null = module-level
  type: 'unlimited' | 'count';
  quota: number | null; // null nếu unlimited (total quota including bonus)
  baseQuota?: number | null; // quota gốc từ subscription (không bao gồm bonus)
  bonusQuota?: number | null; // quota bonus từ xem quảng cáo, promotion, etc.
  remaining: number | null; // null nếu unlimited
  resetAt: string | null; // ISO
};
