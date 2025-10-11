import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';

import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionDocument, SubscriptionSchema } from './schema/subscription.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: SubscriptionDocument.name, schema: SubscriptionSchema }])],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService, MongooseModule],
})
export class SubscriptionModule {}
