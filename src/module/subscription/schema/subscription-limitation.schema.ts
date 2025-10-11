// src/schemas/subscription-limitation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class FunctionRule {
  @Prop({ required: true, trim: true, lowercase: true })
  key: string; // 'create', 'update', 'export'

  @Prop({ enum: ['count', 'unlimited'], default: 'count' })
  type: 'count' | 'unlimited';

  @Prop({ min: 0, default: 0 })
  quota?: number;

  @Prop({ enum: ['calendar', 'rolling'], default: 'calendar' })
  windowType?: 'calendar' | 'rolling';

  @Prop({ enum: ['minute', 'hour', 'day', 'week', 'month', 'lifetime'], default: 'month' })
  windowUnit?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'lifetime';

  @Prop({ min: 1, default: 1 })
  windowSize?: number;

  @Prop({ min: 0, default: 0 })
  burst?: number;

  @Prop({ min: 0, default: 0 })
  concurrency?: number;
}
export const FunctionRuleSchema = SchemaFactory.createForClass(FunctionRule);

@Schema({ _id: false })
export class ModuleRule {
  @Prop({ required: true, trim: true, lowercase: true })
  key: string; // 'booking', 'payment', 'report'

  // ✅ Rule áp cho toàn module (nếu không truyền functionKey)
  @Prop({
    type: FunctionRuleSchema,
    required: false,
  })
  moduleRule?: FunctionRule;

  // Rule riêng cho từng function (nếu có truyền functionKey)
  @Prop({ type: [FunctionRuleSchema], default: [] })
  functions: FunctionRule[];
}
export const ModuleRuleSchema = SchemaFactory.createForClass(ModuleRule);

@Schema({ _id: false })
export class SubscriptionLimitationSubDocument {
  @Prop({ enum: ['allow', 'block'], default: 'block' })
  defaultAction: 'allow' | 'block';

  @Prop({ type: [ModuleRuleSchema], default: [] })
  modules: ModuleRule[];
}
export const SubscriptionLimitationSchema = SchemaFactory.createForClass(SubscriptionLimitationSubDocument);
