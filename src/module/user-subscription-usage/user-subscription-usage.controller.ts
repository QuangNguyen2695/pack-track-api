import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { UserSubscriptionUsageService } from './user-subscription-usage.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

@Controller('user-subscription-usage')
export class UserSubscriptionUsageController {
  constructor(private readonly tenantSubscriptionUsageService: UserSubscriptionUsageService) {}

  @UseGuards(JwtAuthGuard)
  @Get('capabilities')
  getCapabilities(@Request() req) {
    const subjectId = req.user.userId ?? req.user._id;
    const subscriptionId = req.user.subscriptionId;
    return this.tenantSubscriptionUsageService.buildCapabilities(subscriptionId, subjectId);
  }
}
