// otp.controller.ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthRescueService } from './auth-rescue.service';
import { RequestAuthRescueDto, VerifyAuthRescueDto } from './dto/auth-rescue.dto';

@Controller('auth/rescue')
export class AuthRescueController {
  constructor(private readonly authRescueService: AuthRescueService) {}

  @Post('request')
  async request(@Body() requestAuthRescueDto: RequestAuthRescueDto) {
    const res = await this.authRescueService.requestAuthRescue(requestAuthRescueDto.identifier, requestAuthRescueDto.purpose);
    // PRODUCTION: return { success: true } (không trả Token)
    return res;
  }

  @Post('verify')
  @HttpCode(200)
  async verify(@Body() verifyAuthRescueDto: VerifyAuthRescueDto) {
    return this.authRescueService.verifyAuthRescue(
      verifyAuthRescueDto.identifier,
      verifyAuthRescueDto.purpose,
      verifyAuthRescueDto.token,
    );
  }
}
