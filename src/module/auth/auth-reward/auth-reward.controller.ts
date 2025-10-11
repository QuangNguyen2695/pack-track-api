import { Controller, Get, Post, Req, Res, UseGuards, Query, Param } from '@nestjs/common';
import { AuthRewardStartResponseDto } from './dto/auth-reward-start-response.dto';
import { GoogleSsvVerifier } from './ssv/google-ssv-verifier';
import { AuthRewardService } from './auth-reward.service';
import { UserDailyRewardStatsDto } from './dto/auth-reward-response.dto';

@Controller('auth-reward')
export class AuthRewardController {
  constructor(
    private readonly svc: AuthRewardService,
    private readonly ssv: GoogleSsvVerifier,
  ) {}

  /**
   * Client gọi để lấy nonce 1-lần → dùng làm ssv.customData khi preload.
   */
  @Post('start')
  async start(@Req() req): Promise<AuthRewardStartResponseDto> {
    const userId = String(req.user?.id ?? req.user?._id ?? 'demo-user');
    return this.svc.issueNonce(userId);
  }

  /**
   * AdMob gọi về: xác minh chữ ký + idempotent + cộng thưởng.
   * Trả 200 với body đơn giản để AdMob happy.
   */
  @Get('ssv')
  async ssvCallback(@Req() req, @Res() res) {
    const fullUrl =
      (req.protocol ?? 'https') + '://' + (req.get?.('host') ?? req.headers.host) + (req.originalUrl ?? req.url);

    const ok = await this.ssv.verifyFromFullUrl(fullUrl);
    if (!ok) return res.status(200).send('INVALID');

    const params = this.ssv.parseParams(fullUrl);
    const adEventId = params['transaction_id'] || params['ad_event_id'];
    const rewardAmount = Number(params['reward_amount'] ?? 10);
    const rewardItem = params['reward_item'];

    // Verify nonce/JWT in custom_data
    const jwt = params['custom_data'];
    if (!jwt) return res.status(200).send('BAD_NONCE');

    // Verify JWT (signed by our server in start())
    const jwtLib = (await import('jsonwebtoken')).default as any;
    let claims: any;
    try {
      claims = jwtLib.verify(jwt, process.env.AUTH_REWARD_JWT_SECRET || 'dev-secret-change-me');
    } catch {
      return res.status(200).send('BAD_NONCE');
    }

    const userId = String(claims.sub);
    const adUnitId = String(claims.adUnitId);
    const nonceJti = String(claims.jti);

    const result = await this.svc.handleVerifiedSsv({
      adEventId: adEventId as string,
      userId,
      adUnitId,
      amount: rewardAmount,
      rewardItem,
      raw: params,
      nonceJti,
    });

    if (!result.ok && result['reason'] === 'BAD_NONCE') return res.status(200).send('BAD_NONCE');

    return res.status(200).send('OK');
  }

  /**
   * Lấy thống kê xem quảng cáo hàng ngày của user
   */
  @Get('daily-stats')
  async getDailyStats(@Req() req, @Query('date') date?: string): Promise<UserDailyRewardStatsDto> {
    const userId = String(req.user?.id ?? req.user?._id ?? 'demo-user');
    return this.svc.getDailyRewardStats(userId, date);
  }

  /**
   * Kiểm tra user có thể xem thêm quảng cáo không
   */
  @Get('can-watch')
  async canWatchMoreAds(@Req() req): Promise<{ canWatch: boolean; remainingAds: number }> {
    const userId = String(req.user?.id ?? req.user?._id ?? 'demo-user');
    const canWatch = await this.svc.canWatchMoreAds(userId);
    const stats = await this.svc.getDailyRewardStats(userId);
    
    return {
      canWatch,
      remainingAds: stats.remainingAds
    };
  }

  /**
   * Lấy lịch sử xem quảng cáo của user
   */
  @Get('history')
  async getRewardHistory(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    const userId = String(req.user?.id ?? req.user?._id ?? 'demo-user');
    return this.svc.getUserRewardHistory(userId, Number(page), Number(limit));
  }
}
