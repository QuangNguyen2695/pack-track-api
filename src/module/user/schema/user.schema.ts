// user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class UserAddressDocument extends Document {
  _id: Types.ObjectId;
  type: string;
  addressType: string;
  isDefault: boolean;
}

@Schema({ collection: 'users', timestamps: true })
export class UserDocument extends Document {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop()
  password: string;

  @Prop()
  avatarId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  addresses?: UserAddressDocument[];

  @Prop({ enum: ['male', 'female', 'other'], default: 'other' })
  gender: string;

  @Prop()
  email: string;

  @Prop()
  birthdate?: Date;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ required: true, default: true })
  isTempPassWord: boolean;

  @Prop()
  isEmailVerified: boolean;

  @Prop()
  isPhoneNumberVerified: boolean;

  @Prop()
  isLocked: boolean;

  @Prop()
  isDeleted: boolean;

  @Prop({ default: 0 })
  resetTokenVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
