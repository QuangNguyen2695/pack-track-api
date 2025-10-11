import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';

import { SubscriptionDto, SearchSubscriptionsRes, SearchSubscriptionQuerySortFilter } from './dto/subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionDocument } from './schema/subscription.schema';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(SubscriptionDocument.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<SubscriptionDto> {
    const created = new this.subscriptionModel({ ...dto });
    const saved = await created.save();
    return plainToInstance(SubscriptionDto, saved.toObject());
  }

  async findAll(): Promise<SubscriptionDto[]> {
    const docs = await this.subscriptionModel.find().lean().exec();
    return docs.map((d) => plainToInstance(SubscriptionDto, d));
  }

  async findOne(id: Types.ObjectId): Promise<SubscriptionDto> {
    const doc = await this.subscriptionModel.findOne({ _id: id }).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Subscription with ID "${id}" not found.`);
    }
    return plainToInstance(SubscriptionDto, doc);
  }

  async update(dto: UpdateSubscriptionDto): Promise<SubscriptionDto> {
    const updated = await this.subscriptionModel.findOneAndUpdate({ _id: dto._id }, dto, { new: true }).exec();

    if (!updated) {
      throw new NotFoundException(`Subscription with ID "${dto._id}" not found.`);
    }

    return plainToInstance(SubscriptionDto, updated.toObject());
  }

  async delete(id: Types.ObjectId): Promise<boolean> {
    const res = await this.subscriptionModel.findOneAndDelete({ _id: id }).exec();
    return res !== null;
  }

  async search(
    pageIdx: number,
    pageSize: number,
    keyword: string,
    sortBy: SearchSubscriptionQuerySortFilter,
    filters: SearchSubscriptionQuerySortFilter[],
  ): Promise<SearchSubscriptionsRes> {
    const pipeline = await this.buildQuerySearchSubscriptions(pageIdx, pageSize, keyword, sortBy, filters);

    // Thực hiện tìm kiếm
    const subscriptions = await this.subscriptionModel.aggregate(pipeline).exec();

    // Đếm tổng số mục
    const totalItem = await this.subscriptionModel.countDocuments();

    let result = plainToInstance(
      SubscriptionDto,
      subscriptions.map((tenantSubscription) => tenantSubscription),
    );

    return {
      pageIdx,
      subscriptions: result,
      totalPage: Math.ceil(totalItem / pageSize),
      totalItem,
    };
  }

  async buildQuerySearchSubscriptions(
    pageIdx: number,
    pageSize: number,
    keyword: string,
    sortBy: SearchSubscriptionQuerySortFilter,
    filters: SearchSubscriptionQuerySortFilter[],
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
