// otp.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthRescueController } from './auth-rescue.controller';
import { AuthRescueService } from './auth-rescue.service';
import { AuthRescueDocument, AuthRescueSchema } from './schema/auth-rescue.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: AuthRescueDocument.name, schema: AuthRescueSchema }])],
  providers: [AuthRescueService],
  controllers: [AuthRescueController],
  exports: [AuthRescueService, MongooseModule],
})
export class AuthRescueModule {}
