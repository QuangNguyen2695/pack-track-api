// auth.service.ts

import { forwardRef, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { isPhoneNumber } from 'class-validator';
import e from 'express';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthRescueService } from '../auth-rescue/auth-rescue.service';
import { UserService } from '@/module/user/user.service';
import { UserDto } from '@/module/user/dto/user.dto';

@Injectable()
export class AuthService {
  private FRONTEND_RESET_URL = process.env.FRONTEND_RESET_URL ?? 'https://localhost:8100/reset-password';

  constructor(
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @Inject(forwardRef(() => AuthRescueService)) private readonly authRescueService: AuthRescueService,

    private jwtService: JwtService,
    @Inject('RESET_JWT') private readonly resetJwt: JwtService, // reset token (mới)
  ) {}

  // Xác thực người dùng khi đăng nhập
  async validateUser(phoneNumber: string, password: string): Promise<any> {
    const user = await this.userService.validateUser(phoneNumber, password);
    if (user) {
      return user;
    }
    return null;
  }

  // Đăng nhập và trả về JWT token
  async login(user: UserDto) {
    const payload = {
      _id: user._id.toString(),
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // Xác thực người dùng khi đăng nhập
  async verifyPhoneNumber(phoneNumber: string): Promise<any> {
    const user = await this.userService.findByPhoneNumber(phoneNumber);
    if (user) {
      return user.name;
    }
    return null;
  }

  async validateOtp(userId: Types.ObjectId, otp: string): Promise<boolean> {
    const valid = await this.authRescueService.verifyAuthRescue(userId.toString(), '2fa', otp);
    return valid;
  }

  async forgotPasswordInApp(identifier: string, redirectBaseUrl?: string) {
    let user: UserDto | null = null;

    if (identifier && isPhoneNumber(identifier, 'VN')) {
      user = await this.userService.findByPhoneNumber(identifier);
    } else if (identifier && identifier.includes('@')) {
      user = await this.userService.findByEmail(identifier.toLowerCase().trim());
    }

    // Trả 200 kể cả không tồn tại user để tránh lộ email
    if (!user) return null;

    // (khuyên dùng) password fingerprint để auto-invalidate nếu pass đã đổi
    const pwdFinger = crypto.createHash('sha256').update(user.password).digest('hex');

    const payload = {
      sub: user._id,
      v: user.resetTokenVersion ?? 0, // version hiện tại
      pf: pwdFinger, // password fingerprint
    };

    const token = await this.resetJwt.signAsync(payload); // dùng RESET_JWT
    const base = redirectBaseUrl ?? this.FRONTEND_RESET_URL;
    const resetUrl = `${base}?token=${token}`;

    return { token };
    // return { ok: true };
  }

  async forgotPassword(identifier: string, redirectBaseUrl?: string) {
    let user: UserDto | null = null;

    if (identifier && isPhoneNumber(identifier, 'VN')) {
      user = await this.userService.findByPhoneNumber(identifier);
    } else if (identifier && identifier.includes('@')) {
      user = await this.userService.findByEmail(identifier.toLowerCase().trim());
    }

    // Trả 200 kể cả không tồn tại user để tránh lộ email
    if (!user) return { ok: true };

    // (khuyên dùng) password fingerprint để auto-invalidate nếu pass đã đổi
    const pwdFinger = crypto.createHash('sha256').update(user.password).digest('hex');

    const payload = {
      sub: user._id,
      v: user.resetTokenVersion ?? 0, // version hiện tại
      pf: pwdFinger, // password fingerprint
    };

    const token = await this.resetJwt.signAsync(payload); // dùng RESET_JWT
    const base = redirectBaseUrl ?? this.FRONTEND_RESET_URL;
    const resetUrl = `${base}?token=${token}`;
    console.log('🚀 ~ AuthService ~ forgotPassword ~ resetUrl:', resetUrl);

    // TODO: gửi email chứa resetUrl (bạn đã có mail service thì dùng)
    // await this.emailService.sendResetPasswordLink(user.email, resetUrl);

    return { ok: resetUrl };
    // return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    let decoded: any;
    try {
      decoded = await this.resetJwt.verifyAsync(token); // verify bằng RESET_JWT (aud/iss/secret riêng)
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userService.findById(new Types.ObjectId(decoded.sub));
    if (!user) throw new NotFoundException('User not found');

    // Kiểm tra version
    if ((user.resetTokenVersion ?? 0) !== decoded.v) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Kiểm tra password fingerprint (auto revoke nếu pass đã đổi sau khi phát hành token)
    const currentFinger = crypto.createHash('sha256').update(user.password).digest('hex');
    if (currentFinger !== decoded.pf) {
      throw new UnauthorizedException('Token invalid due to password change');
    }

    // Đổi mật khẩu
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Tăng version để revoke tất cả token reset còn lại
    user.resetTokenVersion = (user.resetTokenVersion ?? 0) + 1;

    await this.userService.updateUserField(user._id, 'resetTokenVersion', user.resetTokenVersion);
    await this.userService.updateUserField(user._id, 'password', hashedPassword);
    return { ok: true };
  }
}
