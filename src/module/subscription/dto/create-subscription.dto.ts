import { OmitType } from '@nestjs/mapped-types';
import { SubscriptionDto } from './subscription.dto';

export class CreateSubscriptionDto extends OmitType(SubscriptionDto, [
  '_id',
  'createdAt',
  'updatedAt',
  '__v',
] as const) {}
