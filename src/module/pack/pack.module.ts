import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackController } from './pack.controller';
import { PackService } from './pack.service';
import { PackDocument, PackSchema } from './schema/pack.schema';
import { Device } from '../device/schema/device.schema';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PackDocument.name, schema: PackSchema }]),
    forwardRef(() => DeviceModule),
  ],
  controllers: [PackController],
  providers: [PackService],
  exports: [PackService],
})
export class PackModule {}
