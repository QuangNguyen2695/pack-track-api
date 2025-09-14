// otp.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as crypto from 'crypto';

@Schema({ timestamps: true, collection: 'auth_rescue' })
export class AuthRescueDocument extends Document {
  @Prop({ required: true }) // email hoặc phone
  identifier: string;

  @Prop({ required: true, enum: ['reset_password', '2fa'] })
  purpose: string;

  @Prop({ required: true }) // băm OTP, không lưu plain text
  tokenHash: string;

  @Prop({ required: true }) // thời điểm hết hạn
  expiresAt: Date;

  @Prop({ default: 0 }) // số lần nhập sai
  attempts: number;

  @Prop() // tạm khóa nếu spam
  lockedUntil?: Date;

  @Prop({ default: false }) // 1 lần dùng
  consumed: boolean;
}

export const AuthRescueSchema = SchemaFactory.createForClass(AuthRescueDocument);

// TTL index: Mongo sẽ tự xoá doc sau khi hết hạn
AuthRescueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Một identifier + purpose chỉ nên có 1 Token còn hiệu lực
AuthRescueSchema.index({ identifier: 1, purpose: 1, consumed: 1 }, { unique: false });

// Helper hash (tuỳ chọn dùng ở service)
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
