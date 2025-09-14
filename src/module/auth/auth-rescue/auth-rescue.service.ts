// otp.service.ts
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRescueDocument, hashToken } from './schema/auth-rescue.schema';

@Injectable()
export class AuthRescueService {
  private MAX_ATTEMPTS = 5;
  private LOCK_MINUTES = 10;
  private TOKEN_LENGTH = 6;
  private TOKEN_TTL_MINUTES = 5;

  constructor(@InjectModel(AuthRescueDocument.name) private authRescueModel: Model<AuthRescueDocument>) {}

  private generateNumericToken(len: number, purpose: string = '2fa'): string {
    // an toàn hơn Math.random()
    const digits = Array.from(crypto.getRandomValues(new Uint32Array(len)))
      .map((n) => (n % 10).toString())
      .join('');
    return digits;
  }

  async requestAuthRescue(identifier: string, purpose: string) {
    // tạo Token mới
    const tokenPlain = this.generateNumericToken(this.TOKEN_LENGTH);
    const tokenHashed = hashToken(tokenPlain);
    const expiresAt = new Date(Date.now() + this.TOKEN_TTL_MINUTES * 60 * 1000);

    // xoá các Token cũ chưa dùng của cùng identifier/purpose
    await this.authRescueModel
      .deleteMany({
        identifier,
        purpose,
        consumed: false,
      })
      .exec();

    // tạo bản ghi mới
    await this.authRescueModel.create({
      identifier,
      purpose,
      tokenHash: tokenHashed,
      expiresAt,
      attempts: 0,
      consumed: false,
    });

    // TODO: gửi otpPlain qua SMS/Email ở đây (không log ra server!)
    // ví dụ: await this.smsService.send(identifier, `Your OTP is ${otpPlain}`);

    // Với mục đích demo, return Token để bạn test; PRODUCTION: KHÔNG return!
    return { expiresAt, debugToken: tokenPlain };
  }

  async verifyAuthRescue(identifier: string, purpose: string, token: string) {
    const rec = await this.authRescueModel
      .findOne({
        identifier,
        purpose,
        consumed: false,
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!rec) {
      throw new BadRequestException('OTP not found or already used');
    }

    const now = new Date();

    if (rec.lockedUntil && rec.lockedUntil > now) {
      throw new ForbiddenException(`Too many attempts. Try again after ${rec.lockedUntil.toISOString()}`);
    }

    if (rec.expiresAt <= now) {
      await this.authRescueModel.deleteOne({ _id: rec._id }).exec();
      throw new BadRequestException('OTP expired');
    }

    const isMatch = rec.tokenHash === hashToken(token);
    if (!isMatch) {
      rec.attempts += 1;
      if (rec.attempts >= this.MAX_ATTEMPTS) {
        rec.lockedUntil = new Date(now.getTime() + this.LOCK_MINUTES * 60 * 1000);
      }
      await rec.save();
      throw new BadRequestException('OTP invalid');
    }

    // Đúng Token → đánh dấu consumed để chống dùng lại
    rec.consumed = true;
    await rec.save();

    // Xoá luôn (tuỳ chiến lược)
    // await this.authRescueModel.deleteOne({ _id: rec._id }).exec();

    // Trả kết quả cho luồng tiếp theo (issue JWT, cho phép reset password…)
    return true;
  }
}
