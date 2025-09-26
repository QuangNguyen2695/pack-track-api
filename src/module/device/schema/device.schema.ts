import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

@Schema({ timestamps: true, collection: 'devices' })
export class Device extends Document {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: any;

  @Prop({ type: String, required: true })
  deviceId: string;

  @Prop({ type: String, required: true })
  installationId: string;

  @Prop({ type: String, enum: ['ios', 'android', 'web'], required: true, index: true })
  platform: string;

  @Prop({ type: String })
  appVersion: string;

  @Prop({ type: String })
  osVersion: string;

  @Prop({ type: String })
  modelDevice: string;

  @Prop({ type: String })
  manufacturer: string;

  @Prop({ type: String })
  pushToken?: string;

  @Prop({ type: Boolean, default: true })
  notificationEnabled?: boolean;

  @Prop({ type: String })
  locale?: string;

  @Prop({ type: String })
  timeZone?: string;

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: String })
  carrier?: string;

  @Prop({ type: Boolean, default: false, index: true })
  isPrimary: boolean;

  @Prop({ type: Date, default: () => new Date(), index: true })
  lastActiveAt: Date;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

// Unique + coverage indexes
DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
DeviceSchema.index({ userId: 1, installationId: 1 });
DeviceSchema.index({ platform: 1, lastActiveAt: -1 });

// Auto-update lastActiveAt on save/update
DeviceSchema.pre('save', function (next) {
  (this as any).lastActiveAt = new Date();
  next();
});
