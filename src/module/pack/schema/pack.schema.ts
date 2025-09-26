import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

@Schema({ timestamps: true, collection: 'packs' })
export class PackDocument extends Document {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true }) userId: any;

  @Prop({ type: String, required: true, index: true }) deviceId: string;
  @Prop({ type: String, required: true, index: true }) packNumber: string;
  @Prop({ type: String, index: true }) orderCode?: string;

  @Prop({ type: Date, required: true, index: true }) createDate: Date;
  @Prop({ type: Date, required: true, index: true }) startRecordDate: Date;
  @Prop({ type: Date, required: true, index: true }) endRecordDate: Date;

  @Prop({ type: Number, required: true, min: 0 }) timeRecordedMs: number;

  @Prop({
    type: String,
    enum: ['recorded', 'uploading', 'uploaded', 'verified', 'failed'],
    default: 'recorded',
    index: true,
  })
  status: string;

  @Prop({ type: String, enum: ['local', 's3', 'gcs', 'azure'], index: true }) videoStorage?: string;
  @Prop({ type: String, index: true }) videoStorageKey?: string;
  @Prop({ type: String }) videoFileName?: string;
  @Prop({ type: Number }) videoFileSize?: number;
  @Prop({ type: String }) videoMimeType?: string;
  @Prop({ type: String }) videoResolution?: string;
  @Prop({ type: String }) videoFrameRate?: string;
  @Prop({ type: String, index: true }) videoChecksum?: string;

  @Prop({ type: String }) appVersion?: string;
  @Prop({ type: String }) ip?: string;

  @Prop({ type: [String], index: true }) tags?: string[];
  @Prop({ type: String, maxlength: 256 }) notes?: string;

  @Prop({ type: Date, default: null, index: true }) lastAccessAt?: Date;
  @Prop({ type: Date, default: null, index: true }) deletedAt?: Date | null;
}

export const PackSchema = SchemaFactory.createForClass(PackDocument);

// Index gợi ý
PackSchema.index({ deviceId: 1, startRecordDate: -1 });
PackSchema.index({ packNumber: 1, startRecordDate: -1 });
PackSchema.index({ orderCode: 1, startRecordDate: -1 });
