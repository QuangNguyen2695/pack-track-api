import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from './schema/device.schema';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }])],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
