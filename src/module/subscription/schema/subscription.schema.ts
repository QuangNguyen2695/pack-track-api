import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SubscriptionLimitationSchema, SubscriptionLimitationSubDocument } from './subscription-limitation.schema';

@Schema({ collection: 'subscriptions', timestamps: true })
export class SubscriptionDocument extends Document {
  // _id có sẵn từ Document

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  code: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop()
  description: string;

  // Ví dụ: duration = số tháng/ngày tuỳ bạn quy ước
  @Prop({ required: true, min: 0 })
  duration: number;

  @Prop({ enum: ['month', 'day', 'year', 'lifetime'], required: true })
  durationUnit: 'month' | 'week' | 'day' | 'year' | 'lifetime';

  @Prop({ type: SubscriptionLimitationSchema, required: true })
  limitation: SubscriptionLimitationSubDocument;
  // createdAt/updatedAt tự động do timestamps: true

  @Prop({ type: String, required: true, default: 'active' })
  status: string; // 'active', 'inactive', 'archived' (tuỳ bạn quy ước)
}

export const SubscriptionSchema = SchemaFactory.createForClass(SubscriptionDocument);

// (Tuỳ chọn) index theo name nếu cần tìm kiếm nhanh
// SubscriptionSchema.index({ name: 1 }, { unique: true, sparse: true });
