import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from '@/decorators/roles.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UserSubscriptionService } from './user-subscription.service';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { UserTokenDto } from '@/jwt/dto/user-token.dto';
import { ParseObjectIdPipe } from '@/common/pipes/parse-objectId.pipe';
import { RegisterSubscriptionDto } from './dto/user-subscription.dto';

@Controller('User-subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserSubscriptionController {
  constructor(private svc: UserSubscriptionService) {}

  @Roles('admin', 'User') // hoặc 'owner' tuỳ mô hình
  @Post('register')
  register(@Body(ParseObjectIdPipe) dto: RegisterSubscriptionDto, @CurrentUser(ParseObjectIdPipe) user: UserTokenDto) {
    const UserId = new Types.ObjectId(user._id);
    return this.svc.registerForUser(UserId, dto);
  }
}
