import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession, Connection } from 'mongoose';
import { UserSubscriptionDocument } from './schema/user-subscription.schema';
import { SubscriptionDocument } from '../subscription/schema/subscription.schema';
import {
  RegisterSubscriptionByCodeDto,
  RegisterSubscriptionDto,
  SearchUserSubscriptionQuerySortFilter,
  SearchUserSubscriptionRes,
  UserSubscriptionDto,
} from './dto/user-subscription.dto';
import { plainToInstance } from 'class-transformer';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // handle end-of-month rollover
  if (d.getDate() < day) d.setDate(0);
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable()
export class UserSubscriptionService {
  constructor(
    @InjectModel(UserSubscriptionDocument.name)
    private readonly UserSubModel: Model<UserSubscriptionDocument>,
    @InjectModel(SubscriptionDocument.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Đăng ký subscription cho User hiện tại.
   * - Nếu replaceCurrent=false và đang có sub 'active' (thời gian chồng lắp) => throw.
   * - Nếu replaceCurrent=true => chuyển status bản hiện tại thành 'canceled'.
   * - Snapshot name/price/duration/limitation để cố định theo thời điểm mua.
   */
  async registerForUser(userId: Types.ObjectId, dto: RegisterSubscriptionDto): Promise<UserSubscriptionDto> {
    const subId = new Types.ObjectId(dto.subscriptionId);
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(async () => {
        const plan = await this.subscriptionModel.findById(subId).lean().session(session);
        if (!plan) throw new NotFoundException('Subscription plan not found');

        const startAt = dto.startAt ? new Date(dto.startAt) : new Date();
        if (isNaN(+startAt)) throw new BadRequestException('Invalid startAt');

        const durationUnit = dto.durationUnit ?? 'month';
        const duration = dto.durationOverride ?? plan.duration ?? 0;

        const endAt = durationUnit === 'day' ? addDays(startAt, duration) : addMonths(startAt, duration);

        // Kiểm tra chồng lắp active
        const overlapping = await this.UserSubModel.findOne({
          userId,
          status: 'active',
          // overlap nếu startAt < endAt_new && endAt > startAt_new
          startAt: { $lt: endAt },
          endAt: { $gt: startAt },
        }).session(session);

        if (overlapping) {
          if (dto.replaceCurrent) {
            overlapping.status = 'canceled';
            await overlapping.save({ session });
          } else {
            throw new BadRequestException('User already has an active subscription in this period');
          }
        }

        const created = await this.UserSubModel.create(
          [
            {
              userId,
              subscriptionId: plan._id,
              name: plan.name,
              price: plan.price,
              duration,
              durationUnit,
              limitationSnapshot: plan.limitation, // snapshot nguyên trạng
              startAt,
              endAt,
              status: 'active',
            },
          ],
          { session },
        );

        return plainToInstance(UserSubscriptionDto, created[0]);
      });
    } finally {
      session.endSession();
    }
  }

  assignDefaultSubscriptionToUser(userId: Types.ObjectId) {
    const registerSubscriptionByCodeDto: RegisterSubscriptionByCodeDto = {
      code: 'free',
      durationUnit: 'lifetime',
      replaceCurrent: false,
    };

    return this.registerForUserByCode(userId, registerSubscriptionByCodeDto);
  }

  async registerForUserByCode(
    userId: Types.ObjectId,
    dto: RegisterSubscriptionByCodeDto,
  ): Promise<UserSubscriptionDto> {
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(async () => {
        const plan = await this.subscriptionModel.findOne({ code: dto.code }).lean().session(session);
        if (!plan) throw new NotFoundException('Subscription plan not found');

        const startAt = dto.startAt ? new Date(dto.startAt) : new Date();
        if (isNaN(+startAt)) throw new BadRequestException('Invalid startAt');

        // === NEW: hỗ trợ lifetime ===
        // Nếu DTO có durationUnit thì ưu tiên DTO; nếu không, lấy theo plan.
        const durationUnit: 'day' | 'month' | 'lifetime' = (dto.durationUnit as any) ?? plan.durationUnit ?? 'month';

        // Với lifetime: bỏ qua duration/durationOverride
        const isLifetime = durationUnit === 'lifetime';

        const duration = isLifetime ? 0 : (dto.durationOverride ?? plan.duration ?? 0);

        // endAt: lifetime -> mốc rất xa; còn lại -> addDays/addMonths như cũ
        const LIFETIME_END = new Date('9999-12-31T23:59:59.999Z');

        const endAt = isLifetime
          ? LIFETIME_END
          : durationUnit === 'day'
            ? addDays(startAt, duration)
            : addMonths(startAt, duration);

        // Kiểm tra chồng lắp active
        // overlap nếu startAt < endAt_new && endAt > startAt_new
        const overlapping = await this.UserSubModel.findOne({
          userId,
          status: 'active',
          startAt: { $lt: endAt },
          endAt: { $gt: startAt },
        }).session(session);

        if (overlapping) {
          if (dto.replaceCurrent) {
            overlapping.status = 'canceled';
            await overlapping.save({ session });
          } else {
            throw new BadRequestException('User already has an active subscription in this period');
          }
        }

        const created = await this.UserSubModel.create(
          [
            {
              userId,
              subscriptionId: plan._id,
              name: plan.name,
              price: plan.price,
              // Lifetime không cần duration, nhưng vẫn lưu duration=0 + unit='lifetime' để thống nhất
              duration,
              durationUnit, // 'day' | 'month' | 'lifetime'
              limitationSnapshot: plan.limitation, // snapshot nguyên trạng
              startAt,
              endAt,
              status: 'active',
            },
          ],
          { session },
        );

        return plainToInstance(UserSubscriptionDto, created[0]);
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * Tiện ích: lấy sub 'active' hiện tại (nếu còn hạn).
   */
  async getActive(userId: Types.ObjectId) {
    const now = new Date();
    return this.UserSubModel.findOne({
      userId,
      status: 'active',
      startAt: { $lte: now },
      endAt: { $gt: now },
    }).exec();
  }

  async findByUserId(userId: Types.ObjectId): Promise<UserSubscriptionDto | null> {
    const UserSubModel = await this.UserSubModel.findOne({ userId }).lean().exec();
    if (!UserSubModel) return null;
    let User = plainToInstance(UserSubscriptionDto, UserSubModel);

    return User;
  }

  async findAllByUserId(userId: Types.ObjectId): Promise<UserSubscriptionDto[]> {
    const UserSubModels = await this.UserSubModel.find({ userId }).lean().exec();
    let Users = plainToInstance(
      UserSubscriptionDto,
      UserSubModels.map((User) => User),
    );

    return Users;
  }

  async search(
    pageIdx: number,
    pageSize: number,
    keyword: string,
    sortBy: SearchUserSubscriptionQuerySortFilter,
    filters: SearchUserSubscriptionQuerySortFilter[],
  ): Promise<SearchUserSubscriptionRes> {
    const pipeline = await this.buildQuerySearchUserSubscriptions(pageIdx, pageSize, keyword, sortBy, filters);

    // Thực hiện tìm kiếm
    const UserSubscriptions = await this.UserSubModel.aggregate(pipeline).exec();

    // Đếm tổng số mục
    const totalItem = await this.UserSubModel.countDocuments();

    let result = plainToInstance(
      UserSubscriptionDto,
      UserSubscriptions.map((UserSubscription) => UserSubscription),
    );

    return {
      pageIdx,
      UserSubscriptions: result,
      totalPage: Math.ceil(totalItem / pageSize),
      totalItem,
    };
  }

  async buildQuerySearchUserSubscriptions(
    pageIdx: number,
    pageSize: number,
    keyword: string,
    sortBy: SearchUserSubscriptionQuerySortFilter,
    filters: SearchUserSubscriptionQuerySortFilter[],
  ) {
    // Thêm điều kiện kiểm tra điểm khởi hành nếu có

    const skip = pageIdx ? (pageIdx - 1) * pageSize : 0;

    const pipeline: any = [];
    const matchConditions: any[] = [];

    // 1. Tìm theo keyword
    if (keyword) {
      matchConditions.push({
        $or: [{ name: { $regex: keyword, $options: 'i' } }],
      });
    }

    // 2. Xác định start/end date và các filter còn lại
    let startDateValue: string = '';
    let endDateValue: string = '';

    if (Array.isArray(filters)) {
      await Promise.all(
        filters.map(async ({ key, value }) => {
          if (!key || value == null) return;

          if (key === 'startDate') {
            startDateValue = value;
          } else if (key === 'endDate') {
            endDateValue = value;
          } else {
            matchConditions.push({ [key]: value });
          }
        }),
      );
    }

    // 3. Tạo điều kiện range cho createdAt nếu có startDate và/hoặc endDate
    if (startDateValue || endDateValue) {
      const rangeCond: any = {};
      if (startDateValue) rangeCond.$gte = startDateValue;
      if (endDateValue) rangeCond.$lte = endDateValue;

      matchConditions.push({ createDate: rangeCond });
    }

    // 4. Đẩy $match nếu có bất kỳ điều kiện nào
    if (matchConditions.length) {
      pipeline.push({
        $match: { $and: matchConditions },
      });
    }

    // 4. $sort
    if (sortBy?.key) {
      pipeline.push({
        $sort: { [sortBy.key]: sortBy.value === 'asc' ? 1 : -1 },
      });
    }

    // 5. paging: $skip + $limit
    pipeline.push({ $skip: skip }, { $limit: pageSize });
    return pipeline;
  }
}
