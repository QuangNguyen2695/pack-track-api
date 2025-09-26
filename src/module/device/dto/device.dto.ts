import { Exclude, Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class DeviceDto {
  @Expose()
  _id: Types.ObjectId; // ID tự sinh trong MongoDB cho mỗi thiết bị

  @Expose()
  userId: Types.ObjectId; // User gắn với thiết bị này

  @Expose()
  deviceId: string; // ID duy nhất của thiết bị (UUID do native layer tạo, cố định theo máy)

  @Expose()
  installationId: string; // ID cho lần cài đặt app, thay đổi khi user gỡ & cài lại app

  @Expose()
  platform: string; // Nền tảng của thiết bị: 'ios' | 'android' | 'web'

  @Expose()
  appVersion: string; // Phiên bản app đang chạy (VD: 2.3.1)

  @Expose()
  osVersion: string; // Phiên bản hệ điều hành (VD: iOS 17.3, Android 14)

  @Expose()
  model: string; // Model thiết bị (VD: iPhone 15 Pro, Samsung S23)

  @Expose()
  manufacturer: string; // Hãng sản xuất (Apple, Samsung, Xiaomi...)

  @Expose()
  pushToken?: string; // Token FCM/APNs để gửi push notification

  @Expose()
  notificationEnabled?: boolean; // User có cho phép thông báo không

  @Expose()
  locale?: string; // Ngôn ngữ của thiết bị (VD: vi-VN, en-US)

  @Expose()
  timeZone?: string; // Múi giờ (VD: Asia/Ho_Chi_Minh)

  @Expose()
  ip?: string; // IP gần nhất khi thiết bị gửi request

  @Expose()
  carrier?: string; // Nhà mạng di động (VD: Viettel, Vinaphone...)

  @Expose()
  isPrimary: boolean; // Đánh dấu thiết bị chính của user

  @Expose()
  lastActiveAt: Date; // Thời điểm hoạt động gần nhất

  @Expose()
  createdAt: Date; // Ngày tạo bản ghi

  @Exclude()
  updatedAt: Date; // Ngày cập nhật gần nhất (ẩn đi khi trả về API)

  @Exclude()
  deletedAt?: Date | null; // Nếu khác null => thiết bị đã bị soft delete

  @Expose()
  @Transform(({ obj }) => !obj.deletedAt)
  active: boolean; // Trạng thái thiết bị: true nếu chưa bị xóa
}
