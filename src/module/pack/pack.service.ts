import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreatePackDto } from './dto/create-pack.dto';
import { UpdatePackDto } from './dto/update-pack.dto';
import { PackDocument } from './schema/pack.schema';
import { plainToClass, plainToInstance } from 'class-transformer';
import { PackDto } from './dto/pack.dto';
import { SearchPackQuerySortFilter, SearchPackRes } from './dto/query-pack.dto';
import { DeviceService } from '../device/device.service';
import { DeviceDto } from '../device/dto/device.dto';

@Injectable()
export class PackService {
  constructor(
    @InjectModel(PackDocument.name) private packModel: Model<PackDocument>,
    @Inject(forwardRef(() => DeviceService)) private readonly deviceService: DeviceService,
  ) {}

  async create(dto: CreatePackDto) {
    const doc = await this.packModel.create({
      ...dto,
      createDate: new Date(dto.createDate),
      startRecordDate: new Date(dto.startRecordDate),
      endRecordDate: new Date(dto.endRecordDate),
      status: dto.status ?? 'recorded',
      deletedAt: null,
      lastAccessAt: new Date(),
    });
    return doc.toObject();
  }

  async update(id: string, dto: UpdatePackDto) {
    const doc = await this.packModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        $set: {
          ...dto,
          lastAccessAt: new Date(),
        },
      },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Pack not found');
    return doc.toObject();
  }

  async findById(id: string) {
    const doc = await this.packModel.findOne({ _id: id, deletedAt: null }).lean();
    if (!doc) throw new NotFoundException('Pack not found');
    return doc;
  }

  async softDelete(id: string) {
    const doc = await this.packModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Pack not found');
    return { success: true };
  }

  /** tiện ích: đánh dấu đã upload xong (lưu size/checksum/key/status) */
  async markUploaded(
    id: string,
    payload: { videoStorageKey?: string; videoFileSize?: number; videoChecksum?: string },
  ) {
    const doc = await this.packModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { ...payload, status: 'uploaded', lastAccessAt: new Date() } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Pack not found');
    return doc.toObject();
  }

  /** đánh dấu đã kiểm tra/verify OK */
  async markVerified(id: string) {
    const doc = await this.packModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { status: 'verified', lastAccessAt: new Date() } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Pack not found');
    return doc.toObject();
  }

  async search(
    pageIdx: number,
    pageSize: number,
    keyword: string,
    sortBy: SearchPackQuerySortFilter,
    filters: SearchPackQuerySortFilter[],
    userId: Types.ObjectId,
  ): Promise<SearchPackRes> {
    const pipeline = await this.buildQuerySearchPack(pageIdx, pageSize, keyword, sortBy, filters);

    // Thực hiện tìm kiếm
    const packs = await this.packModel.aggregate(pipeline).exec();

    // Đếm tổng số mục
    const totalItem = await this.packModel.countDocuments();

    const result = plainToInstance(
      PackDto,
      await Promise.all(
        packs.map(async (pack: PackDto) => {
          const device = await this.deviceService.findByDeviceId(userId, pack.deviceId);
          if (device) {
            pack.device = plainToInstance(DeviceDto, device);
          }
          return pack;
        }),
      ),
    );

    return {
      pageIdx,
      packs: result,
      totalPage: Math.ceil(totalItem / pageSize),
      totalItem,
    };
  }

  async buildQuerySearchPack(
    pageIdx: number,
    pageSize: number,
    keyword: string,
    sortBy: SearchPackQuerySortFilter,
    filters: SearchPackQuerySortFilter[],
  ) {
    // Thêm điều kiện kiểm tra điểm khởi hành nếu có

    const skip = pageIdx ? (pageIdx - 1) * pageSize : 0;

    const pipeline: any = [];
    const matchConditions: any[] = [];

    // 1. Tìm theo keyword
    if (keyword) {
      matchConditions.push({
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { packNumber: { $regex: keyword, $options: 'i' } },
          { orderCode: { $regex: keyword, $options: 'i' } },
          { videoStorage: { $regex: keyword, $options: 'i' } },
        ],
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
