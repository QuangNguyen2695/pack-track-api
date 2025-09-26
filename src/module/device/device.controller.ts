import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Type, UseGuards } from '@nestjs/common';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { Roles } from '@/decorators/roles.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { ParseObjectIdPipe } from '@/common/pipes/parse-objectId.pipe';
import { Types } from 'mongoose';
// import { JwtAuthGuard } from '@/module/core/auth/guards/jwt.guard'; // nếu có
// import { UseGuards } from '@nestjs/common';

@Controller('devices')
// @UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  // Upsert theo deviceId (đăng ký hoặc cập nhật footprint)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Post()
  async register(@Body() dto: CreateDeviceDto) {
    const doc = await this.deviceService.registerOrUpdate(dto);
    return { data: doc };
  }

  // List/paginate
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Get()
  async list(@Query() q: QueryDeviceDto) {
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 100);
    const result = await this.deviceService.list({
      userId: q.userId,
      platform: q.platform,
      active: q.active !== undefined ? q.active === 'true' : undefined,
      search: q.search,
      page,
      limit,
    });
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Get(':id')
  async get(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Query('userId', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    return { data: await this.deviceService.findById(userId, id) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Put(':id')
  async update(@Param('id') id: string, @Query('userId') userId: string, @Body() dto: UpdateDeviceDto) {
    return { data: await this.deviceService.update(userId, id, dto) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Put(':id/primary')
  async markPrimary(@Param('id') id: string, @Query('userId') userId: string) {
    return { data: await this.deviceService.markPrimary(userId, id) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Put(':id/push-token')
  async updatePushToken(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() body: { pushToken: string; enabled?: boolean },
  ) {
    return { data: await this.deviceService.updatePushToken(userId, id, body.pushToken, body.enabled) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Delete(':id')
  async remove(@Param('id') id: string, @Query('userId') userId: string) {
    return await this.deviceService.softDelete(userId, id);
  }
}
