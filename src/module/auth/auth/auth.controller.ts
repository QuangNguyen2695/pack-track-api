import { Controller, Request, Post, UseGuards, Get, Req, Param, Query, HttpCode, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '@/guards/local-auth.guard.ts';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UserTokenDto } from '@/jwt/dto/user-token.dto';
import { ParseObjectIdPipe } from '@/common/pipes/parse-objectId.pipe';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Endpoint đăng nhập
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    // Sau khi LocalStrategy xác thực, req.user sẽ chứa thông tin người dùng
    return this.authService.login(req.user);
  }

  @Get('verify-phoneNumber')
  async verifyPhoneNumber(@Query('phoneNumber') phoneNumber: string) {
    const name = await this.authService.verifyPhoneNumber(phoneNumber);
    return JSON.stringify(name);
  }

  // Endpoint kiểm tra token
  @UseGuards(JwtAuthGuard)
  @Get('validate-token')
  async validateToken(@Request() req) {
    // Nếu token hợp lệ, trả về thông tin người dùng
    return { valid: true, user: req.user };
  }

  // Endpoint kiểm tra token
  @UseGuards(JwtAuthGuard)
  @Post('validate-otp:otp')
  async validateOtp(@CurrentUser(ParseObjectIdPipe) user: UserTokenDto, @Param('otp') otp: string) {
    const { _id } = user;
    return this.authService.validateOtp(_id, otp);
  }

  @Post('forgot-password-in-app')
  @HttpCode(200)
  async forgotPasswordInApp(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPasswordInApp(forgotPasswordDto.identifier, forgotPasswordDto.redirectBaseUrl);
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.identifier, forgotPasswordDto.redirectBaseUrl);
  }

  @Post('reset-password')
  async reset(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }
}
