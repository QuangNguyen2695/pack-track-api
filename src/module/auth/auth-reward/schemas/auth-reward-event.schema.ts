import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthRewardEventDocument = HydratedDocument<AuthRewardEvent>;

@Schema({ collection: 'auth_reward_events', timestamps: { createdAt: true, updatedAt: false } })
export class AuthRewardEvent {
  @Prop({ required: true, unique: true })
  adEventId: string; // Google ad_event/transaction id (idempotency key)

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  adUnitId: string;

  @Prop({ required: true })
  amount: number;

  @Prop()
  rewardItem?: string;

  @Prop()
  raw?: string; // optional raw query payload for auditing
}
export const AuthRewardEventSchema = SchemaFactory.createForClass(AuthRewardEvent);
AuthRewardEventSchema.index({ adEventId: 1 }, { unique: true });
