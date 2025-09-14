import { Strategy } from 'passport-local';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from '@/module/auth/auth/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'phoneNumber', // lấy từ body.phoneNumber
      passwordField: 'password', // mặc định là 'password' (ghi rõ cho tường minh)
      passReqToCallback: true, // <<-- QUAN TRỌNG
      // session: false,                 // nếu bạn không dùng session
    });
  }

  // Khi passReqToCallback=true -> validate nhận (req, username, password)
  async validate(req: Request, phoneNumber: string, password: string): Promise<any> {
    // lấy tenantCode từ body (hoặc header/query tuỳ bạn)

    const user = await this.authService.validateUser(phoneNumber, password);
    if (!user) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
    return user;
  }
}
