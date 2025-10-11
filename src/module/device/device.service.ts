import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Device } from './schema/device.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DeviceService {
  constructor(@InjectModel(Device.name) private deviceModel: Model<Device>) {}

  async registerOrUpdate(dto: CreateDeviceDto) {
    const { userId, deviceId } = dto;

    // nếu set isPrimary=true, unset các thiết bị khác của user
    if (dto.isPrimary) {
      await this.deviceModel.updateMany({ userId, isPrimary: true }, { $set: { isPrimary: false } });
    }

    const doc = await this.deviceModel.findOneAndUpdate(
      { userId, deviceId },
      {
        $set: {
          ...dto,
          lastActiveAt: new Date(),
          deletedAt: null, // revive nếu đã bị soft-delete
        },
      },
      { new: true, upsert: true },
    );
    return doc;
  }

  async update(userId: string, id: string, dto: UpdateDeviceDto) {
    if (dto.isPrimary) {
      await this.deviceModel.updateMany({ userId, isPrimary: true }, { $set: { isPrimary: false } });
    }

    const doc = await this.deviceModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { ...dto, lastActiveAt: new Date() } },
      { new: true },
    );
    if (!doc) return null;
    return doc;
  }

  async findById(userId: Types.ObjectId, id: Types.ObjectId) {
    const doc = await this.deviceModel.findOne({ _id: id, userId, deletedAt: null }).lean();
    if (!doc) return null;
    return doc;
  }

  async findByDeviceId(userId: Types.ObjectId, deviceId: string) {
    const doc = await this.deviceModel.findOne({ deviceId, userId, deletedAt: null }).lean();
    if (!doc) return null;
    return doc;
  }

  async list(query: {
    userId?: string;
    platform?: string;
    active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, platform, active, search, page = 1, limit = 20 } = query;

    const filter: FilterQuery<Device> = {};
    if (userId) filter.userId = userId;
    if (platform) filter.platform = platform;
    if (active !== undefined) filter.deletedAt = active ? null : { $ne: null };
    else filter.deletedAt = null;

    if (search) {
      filter.$or = [
        { model: new RegExp(search, 'i') },
        { appVersion: new RegExp(search, 'i') },
        { osVersion: new RegExp(search, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      this.deviceModel
        .find(filter)
        .sort({ isPrimary: -1, lastActiveAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.deviceModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async markPrimary(userId: string, id: string) {
    const doc = await this.deviceModel.findOne({ _id: id, userId, deletedAt: null });
    if (!doc) return null;

    await this.deviceModel.updateMany({ userId, isPrimary: true }, { $set: { isPrimary: false } });
    doc.isPrimary = true;
    doc.lastActiveAt = new Date();
    await doc.save();
    return doc.toObject();
  }

  async updatePushToken(userId: string, id: string, pushToken: string, enabled?: boolean) {
    const doc = await this.deviceModel.findOneAndUpdate(
      { _id: id, userId, deletedAt: null },
      { $set: { pushToken, notificationEnabled: enabled ?? true, lastActiveAt: new Date() } },
      { new: true },
    );
    if (!doc) return null;
    return doc;
  }

  async softDelete(userId: string, id: string) {
    const doc = await this.deviceModel.findOneAndUpdate(
      { _id: id, userId, deletedAt: null },
      { $set: { deletedAt: new Date(), isPrimary: false } },
      { new: true },
    );
    if (!doc) return null;
    return { success: true };
  }
}
