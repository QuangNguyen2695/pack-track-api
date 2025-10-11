// user.module.ts

import { forwardRef, Module } from '@nestjs/common';
import { UserController } from './user.controller'; // Thêm dòng này
import { MongooseModule } from '@nestjs/mongoose';
import { UserDocument, UserSchema } from './schema/user.schema';
import { UserService } from './user.service';
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserDocument.name, schema: UserSchema }]),
    forwardRef(() => UserSubscriptionModule),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
