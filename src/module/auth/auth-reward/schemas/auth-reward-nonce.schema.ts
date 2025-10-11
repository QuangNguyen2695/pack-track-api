import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthRewardNonceDocument = HydratedDocument<AuthRewardNonce>;

@Schema({ collection: 'auth_reward_nonces', timestamps: { createdAt: true, updatedAt: false } })
export class AuthRewardNonce {
  @Prop({ required: true, unique: true })
  jti: string; // one-time id (JWT jti)

  @Prop({ required: true, unique: true })
  userId: string; // enforce single active nonce per user

  @Prop({ required: true })
  adUnitId: string; // rewarded ad unit bound to this nonce

  @Prop({ default: false })
  used: boolean;

  @Prop()
  usedAt?: Date;
}

export const AuthRewardNonceSchema = SchemaFactory.createForClass(AuthRewardNonce);
// Enforce one active nonce per user
AuthRewardNonceSchema.index({ userId: 1 }, { unique: true });
// Uniqueness for one-time usage
AuthRewardNonceSchema.index({ jti: 1 }, { unique: true });
