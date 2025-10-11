import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef, Module } from '@nestjs/common';
import { UserSubscriptionUsageController } from './user-subscription-usage.controller';
import { UserSubscriptionUsageService } from './user-subscription-usage.service';
import {
  UserSubscriptionUsageDocument,
  UserSubscriptionUsageSchema,
} from './schema/user-subscription-usage.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module';
import {
  UserSubscriptionDocument,
  UserSubscriptionSchema,
} from '../user-subscription/schema/user-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSubscriptionUsageDocument.name, schema: UserSubscriptionUsageSchema },
      { name: UserSubscriptionDocument.name, schema: UserSubscriptionSchema },
    ]),
    forwardRef(() => UserSubscriptionModule),
  ],
  controllers: [UserSubscriptionUsageController],
  providers: [UserSubscriptionUsageService],
  exports: [UserSubscriptionUsageService, MongooseModule],
})
export class UserSubscriptionUsageModule {}
