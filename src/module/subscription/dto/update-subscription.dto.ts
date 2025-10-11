import { PartialType } from '@nestjs/mapped-types';
import { Types } from 'mongoose';
import { CreateSubscriptionDto } from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
  readonly _id: Types.ObjectId;
}
