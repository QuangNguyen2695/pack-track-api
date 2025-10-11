// user.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  forwardRef,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdatePasswordUserDto, UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from './schema/user.schema';
import { SearchUsersRes, UserAddressDto, UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { UserSubscriptionDocument } from '../user-subscription/schema/user-subscription.schema';
import { UserSubscriptionService } from '../user-subscription/user-subscription.service';
import { of } from 'rxjs';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(UserDocument.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => UserSubscriptionService))
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  // Tạo mới người dùng
  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    const { password, phoneNumber } = createUserDto;

    // Kiểm tra tính duy nhất của username, email và phoneNumber
    const baseQuery = {};
    const userExists = await this.userModel.findOne({
      $and: [baseQuery, { $or: [{ phoneNumber }] }],
    });

    if (userExists) {
      if (userExists.phoneNumber === phoneNumber) {
        throw new BadRequestException('Số điện thoại đã được sử dụng.');
      }
    }

    createUserDto.addresses?.map((address: UserAddressDto) => {
      address._id = new Types.ObjectId();
    });

    // Băm mật khẩu
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    if (!savedUser) throw new UnauthorizedException('Đăng ký không thành công, vui lòng thử lại.');
    this.userSubscriptionService.assignDefaultSubscriptionToUser(savedUser._id as Types.ObjectId).catch();

    return plainToInstance(UserDto, savedUser.toObject());
  }

  // Cập nhật thông tin người dùng
  async update(updateUserDto: UpdateUserDto): Promise<UserDto> {
    const userModel = await this.userModel.findOne({ _id: updateUserDto._id });
    if (!userModel) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    // Nếu cập nhật email hoặc phoneNumber, cần kiểm tra tính duy nhất
    const { email, phoneNumber } = updateUserDto;

    if (email && email !== userModel.email) {
      const emailExists = await this.userModel.findOne({ email });
      if (emailExists && emailExists._id != updateUserDto._id) {
        throw new BadRequestException('Email đã được sử dụng.');
      }
    }

    if (phoneNumber && phoneNumber !== userModel.phoneNumber) {
      const phoneExists = await this.userModel.findOne({ phoneNumber });
      if (phoneExists && phoneExists._id != updateUserDto._id) {
        throw new BadRequestException('Số điện thoại đã được sử dụng.');
      }
    }

    // Nếu cập nhật mật khẩu, cần băm mật khẩu mới
    if (updateUserDto.password) {
      // Băm mật khẩu
      const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    updateUserDto.addresses =
      updateUserDto.addresses &&
      (await updateUserDto.addresses.map((address: any) => {
        // Check if the address does not have an _id
        if (!address._id) {
          address._id = new Types.ObjectId(); // Assign a new ObjectId
        }
        return address; // Return the updated address
      }));

    Object.assign(userModel, updateUserDto);
    const updatedUser = await userModel.save();

    let user = plainToInstance(UserDto, updatedUser);
    user = this.mapUserAvatarUrl([user])[0];

    return user;
  }

  // Tìm người dùng theo ID
  async findById(userId: Types.ObjectId): Promise<UserDto | null> {
    const userModel = await this.userModel.findOne({ _id: userId }).lean().exec();
    if (!userModel) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    let user = plainToInstance(UserDto, userModel);
    user = this.mapUserAvatarUrl([user])[0];

    return user;
  }

  async findByIds(userIds: Types.ObjectId[]): Promise<UserDto[] | null> {
    const usersModel = await this.userModel
      .find({ _id: { $in: userIds } })
      .lean()
      .exec();
    if (!usersModel || usersModel.length === 0) {
      return null;
    }

    let users = usersModel.map((user) => plainToInstance(UserDto, user));
    users = this.mapUserAvatarUrl(users);

    return users;
  }

  // Tìm người dùng theo tên đăng nhập
  async findByPhoneNumber(phoneNumber: string): Promise<UserDto | null> {
    const query = { phoneNumber: phoneNumber };
    const userModel = await this.userModel.findOne(query).lean().exec();
    if (!userModel) {
      return null;
    }

    let user = plainToInstance(UserDto, userModel);
    user = this.mapUserAvatarUrl([user])[0];

    return user;
  }

  async findAll(): Promise<UserDto[]> {
    const usersModel = await this.userModel.find().lean().exec();

    let users = usersModel.map((user) => plainToInstance(UserDto, user));
    users = this.mapUserAvatarUrl(users);

    return users;
  }

  async findAllByRole(role: string): Promise<UserDto[]> {
    const usersModel = await this.userModel.find({ role }).lean().exec();

    let users = usersModel.map((user) => plainToInstance(UserDto, user));
    users = this.mapUserAvatarUrl(users);

    return users;
  }

  async findOne(id: string): Promise<UserDto> {
    const userModel = await this.userModel.findOne({ _id: id }).lean().exec();
    if (!userModel) {
      throw new NotFoundException(`Bus type with ID "${id}" not found.`);
    }

    let user = plainToInstance(UserDto, userModel);
    user = this.mapUserAvatarUrl([user])[0];

    return user;
  }

  async findByPhone(phoneNumber: string): Promise<UserDto> {
    const userModel = await this.userModel.findOne({ phoneNumber }).lean().exec();
    if (!userModel) {
      throw new NotFoundException(`Bus type with phone number "${phoneNumber}" not found.`);
    }

    let user = plainToInstance(UserDto, userModel);
    user = this.mapUserAvatarUrl([user])[0];

    return user;
  }

  async findByEmail(email: string): Promise<UserDto> {
    const userModel = await this.userModel.findOne({ email }).lean().exec();
    if (!userModel) {
      throw new NotFoundException(`Bus type with email "${email}" not found.`);
    }

    let user = plainToInstance(UserDto, userModel);
    user = this.mapUserAvatarUrl([user])[0];

    return user;
  }

  async findOneByRole(role: string): Promise<UserDto> {
    const userModel = await this.userModel.findOne({ role }).lean().exec();
    if (!userModel) {
      throw new NotFoundException(`Bus type with role "${role}" not found.`);
    }
    let user = plainToInstance(UserDto, userModel);
    user = this.mapUserAvatarUrl([user])[0];

    return user;
  }

  // Xác thực người dùng
  async validateUser(phoneNumber: string, password: string): Promise<UserDto | null> {
    const query = { phoneNumber };
    const userModel = await this.userModel.findOne(query).lean().exec();
    if (!userModel) {
      return null;
    }
    const isMatch = await bcrypt.compare(password, userModel.password);
    if (!isMatch) {
      return null;
    }

    const user = plainToInstance(UserDto, userModel);

    const userSubscription = await this.userSubscriptionService.findByUserId(user._id);

    if (userSubscription) {
      user.subscriptionId = userSubscription.subscriptionId;
    }

    return user;
  }

  async updateUserField(userId: Types.ObjectId, fieldName: string, value: any): Promise<any> {
    const userModel = this.userModel
      .findByIdAndUpdate(userId, { [fieldName]: value }, { new: true })
      .lean()
      .exec();
    if (!userModel) {
      return null;
    }
    return plainToInstance(UserDto, userModel);
  }

  async updatePassword(userId: Types.ObjectId, updatePasswordUserDto: UpdatePasswordUserDto): Promise<UserDto> {
    const user = await this.userModel.findOne({ _id: userId });
    if (!user) throw new NotFoundException('Người dùng không tồn tại.');

    const { oldPassword, password } = updatePasswordUserDto;

    const isOldPasswordRequired = !user.isTempPassWord && !oldPassword;
    const isOldPasswordInvalid = user.isTempPassWord && !(await bcrypt.compare(oldPassword, user.password));

    if (isOldPasswordRequired || isOldPasswordInvalid) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await user.save();
    return plainToInstance(UserDto, updatedUser.toObject());
  }

  async search(
    pageIdx: number,
    pageSize: number,
    keyword: string,
    sortBy: {
      key: string;
      value: string;
    },
    filters: {
      key: string;
      value: string[];
    },
  ): Promise<SearchUsersRes> {
    const skip = pageIdx ? (pageIdx - 1) * pageSize : 0;
    const baseQuery = {};
    const query = keyword
      ? {
          $and: [baseQuery, { $or: [{ name: { $regex: keyword, $options: 'i' } }] }],
        }
      : baseQuery;

    const sortCondition: { [key: string]: 1 | -1 } =
      sortBy.key === 'role' && sortBy.value
        ? sortBy.value === 'ascend'
          ? { role: 1 } // Sort 'role' in ascending order
          : { role: -1 } // Sort 'role' in descending order
        : { createdAt: sortBy?.value === 'ascend' ? 1 : -1 }; // Default to no sorting if key is not 'role'

    const filterCondition =
      filters.key === 'role' && Array.isArray(filters.value) && filters.value.length > 0
        ? { role: { $in: filters.value } } // Filters roles to match any value in the provided list
        : {}; // Default to no filtering if key/value condition is not met

    const finalQuery = { ...query, ...filterCondition };

    const usersModel = await this.userModel
      .find(finalQuery) // Merge query with filter condition
      .skip(skip)
      .limit(pageSize || 999)
      .sort(sortCondition) // Apply the validated sort condition
      .exec();

    const totalItem = await this.userModel.countDocuments(finalQuery);

    let users = usersModel.map((user) => plainToInstance(UserDto, user));
    users = this.mapUserAvatarUrl(users);

    return {
      pageIdx,
      users: users,
      totalPage: Math.ceil(totalItem / pageSize),
      totalItem,
    };
  }

  mapUserAvatarUrl(users: UserDto[]): UserDto[] {
    return users.map((user) => {
      if (user.avatarId) {
        user.avatar = `${process.env.DOMAIN}:${process.env.PORT}/file/view/${user.avatarId.toString()}`;
      }
      return user;
    });
  }
}
