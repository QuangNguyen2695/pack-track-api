import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SubscriptionLimitationSubDocument } from '../../subscription/schema/subscription-limitation.schema';

@Schema({ collection: 'user_subscriptions', timestamps: true })
export class UserSubscriptionDocument extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  subscriptionId: Types.ObjectId;

  // Snapshot để không bị thay đổi khi plan gốc đổi
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  duration: number; // cùng đơn vị với durationUnit

  @Prop({ enum: ['month', 'day', 'year', 'lifetime'], default: 'month' })
  durationUnit: 'month' | 'day' | 'year' | 'lifetime';

  @Prop({ type: Object, required: true })
  limitationSnapshot: SubscriptionLimitationSubDocument;

  @Prop({ required: true })
  startAt: Date;

  @Prop({ required: true })
  endAt: Date;

  @Prop({ enum: ['active', 'canceled', 'expired'], default: 'active', index: true })
  status: 'active' | 'canceled' | 'expired';
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscriptionDocument);

// Query phổ biến
UserSubscriptionSchema.index({ UserId: 1, status: 1, startAt: 1, endAt: 1 });
