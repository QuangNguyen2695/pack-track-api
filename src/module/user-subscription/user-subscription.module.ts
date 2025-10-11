import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSubscriptionService } from './user-subscription.service';
import { UserSubscriptionController } from './user-subscription.controller';

import { UserSubscriptionDocument, UserSubscriptionSchema } from './schema/user-subscription.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { SubscriptionDocument, SubscriptionSchema } from '../subscription/schema/subscription.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSubscriptionDocument.name, schema: UserSubscriptionSchema },
      { name: SubscriptionDocument.name, schema: SubscriptionSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [UserSubscriptionController],
  providers: [UserSubscriptionService],
  exports: [UserSubscriptionService], // nếu nơi khác cần gọi service này
})
export class UserSubscriptionModule {}
