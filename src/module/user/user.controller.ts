// user.controller.ts

import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Put,
  UseGuards,
  Request,
  Get,
  Req,
  Query,
  Param,
  ValidationPipe,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UserTokenDto } from '@/jwt/dto/user-token.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordUserDto, UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { UserDocument } from './schema/user.schema';
import { SearchUsersTypesQuery, UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { Roles } from '@/decorators/roles.decorator';
import { RolesGuard } from '@/guards/roles.guard';
import { ParseObjectIdPipe } from '@/common/pipes/parse-objectId.pipe';
import { StripFields } from '@/interceptors/strip-fields.interceptor';
import { Feature } from '@/decorators/feature.decorator';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseInterceptors(StripFields(['password']))
  @Post('register')
  @Feature('user', 'create')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.userService.create(createUserDto);
      return {
        message: 'Đăng ký thành công!',
        user: { phoneNumber: user.phoneNumber, _id: user._id },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'driver')
  @UseInterceptors(StripFields(['password']))
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser(ParseObjectIdPipe) user: UserTokenDto) {
    return this.userService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'driver')
  @UseInterceptors(StripFields(['password']))
  @Get('role/:role')
  findOneByRole(@Param('role') role: string, @CurrentUser(ParseObjectIdPipe) user: UserTokenDto) {
    return this.userService.findOneByRole(role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'driver')
  @UseInterceptors(StripFields(['password']))
  @Get('find-all/:role')
  findAllByRole(@Param('role') role: string, @CurrentUser(ParseObjectIdPipe) user: UserTokenDto) {
    return this.userService.findAllByRole(role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'driver')
  @UseInterceptors(StripFields(['password']))
  @Get('find-all')
  findAll(@CurrentUser(ParseObjectIdPipe) user: UserTokenDto) {
    return this.userService.findAll();
  }

  // Endpoint cáº­p nháº­t thÃ´ng tin ngÆ°á»i dÃ¹ng
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(StripFields(['password']))
  @Put('profile')
  async updateProfile(@CurrentUser(ParseObjectIdPipe) user: UserTokenDto, @Body() updateUserDto: UpdateUserDto) {
    try {
      const updatedUser = await this.userService.update(updateUserDto);
      return updatedUser;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Endpoint láº¥y thÃ´ng tin ngÆ°á»i dÃ¹ng hiá»‡n táº¡i
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(StripFields(['password']))
  @Get('get-current-user')
  async getCurrentUser(@CurrentUser(ParseObjectIdPipe) user: UserTokenDto) {
    const { _id: userId } = user;
    const foundUser = await this.userService.findById(userId);
    if (!foundUser) {
      throw new BadRequestException('User not found.');
    }
    return plainToInstance(UserDto, foundUser);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(StripFields(['password']))
  @Post('update-password')
  async updatePassword(
    @CurrentUser(ParseObjectIdPipe) user: UserTokenDto,
    @Body() updatePasswordUserDto: UpdatePasswordUserDto,
  ) {
    const updatedUser = await this.userService.updatePassword(user._id, updatePasswordUserDto);
    return {
      message: 'Cập nhật thông tin thành công!',
      user: {
        email: updatedUser.email,
        name: updatedUser.name,
      },
    };
  }

  @Post('/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(StripFields(['password']))
  @Roles('user', 'admin', 'driver')
  search(@Body() query: SearchUsersTypesQuery, @CurrentUser(ParseObjectIdPipe) user: UserTokenDto) {
    const { pageIdx = 0, pageSize = 0, keyword = '', sortBy, filters } = query;
    return this.userService.search(+pageIdx, +pageSize, keyword, sortBy, filters);
  }
}
