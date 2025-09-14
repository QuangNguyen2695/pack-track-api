import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Types } from 'mongoose';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  _id: Types.ObjectId;
  isEmailVerified: boolean = false;
  isLocked: boolean = false;
  isDeleted: boolean = false;
}

export class UpdatePasswordUserDto extends PartialType(UpdateUserDto) {
  oldPassword: string;
  password: string;
}
