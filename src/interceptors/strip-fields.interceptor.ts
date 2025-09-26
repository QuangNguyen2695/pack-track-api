import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Type, mixin } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Types } from 'mongoose'; // ⬅️ cần import để nhận diện ObjectId

type Plain = Record<string, any>;

function toPlain(value: any): any {
  if (value && typeof value.toObject === 'function') {
    // Mongoose Document -> plain object (kèm virtuals/getters nếu cần)
    return value.toObject({ virtuals: true, getters: false, versionKey: false });
  }
  return value;
}

// Nhận diện và chuẩn hoá các kiểu BSON "đặc biệt" bạn muốn stringify
function normalizeBsonScalar(value: any): any {
  // 1) ObjectId (chuẩn Mongoose)
  if (value instanceof Types.ObjectId) return value.toHexString();

  // 2) Trường hợp ObjectId đến từ lib BSON khác (không cùng instance Types.ObjectId)
  if (value?._bsontype === 'ObjectID' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }

  // (Tuỳ chọn) Nếu bạn muốn stringify Decimal128/Long v.v.
  // if (value?._bsontype === 'Decimal128' && typeof value.toString === 'function') return value.toString();

  return value;
}

function deepOmit(value: any, omitSet: Set<string>): any {
  // Chuẩn hoá ngay nếu là scalar BSON đặc biệt (ObjectId, ...)
  const normalized = normalizeBsonScalar(value);
  if (normalized !== value) return normalized;

  if (Array.isArray(value)) {
    return value.map((v) => deepOmit(v, omitSet));
  }

  // Date giữ nguyên
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === 'object') {
    // Nếu là Document -> chuyển sang plain trước
    const plain = toPlain(value);

    // Sau khi toPlain, có thể vẫn còn ObjectId lồng; tiếp tục deepOmit
    if (Array.isArray(plain)) return deepOmit(plain, omitSet);

    const result: Plain = {};
    for (const [k, v] of Object.entries(plain ?? {})) {
      if (omitSet.has(k)) continue;

      // Áp dụng normalize cho từng field trước khi đệ quy
      const nv = normalizeBsonScalar(v);
      result[k] = nv === v ? deepOmit(v, omitSet) : nv;
    }
    return result;
  }

  return value; // primitive
}

/**
 * Tạo interceptor loại bỏ các field nhạy cảm & normalize ObjectId -> string
 * Dùng: @UseInterceptors(StripFields(['password', 'passwordHash', 'salt']))
 */
export function StripFields(fields: string[]): Type<NestInterceptor> {
  @Injectable()
  class StripFieldsInterceptor implements NestInterceptor {
    private readonly omitSet = new Set(fields);

    intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
      return next.handle().pipe(map((data) => deepOmit(data, this.omitSet)));
    }
  }
  return mixin(StripFieldsInterceptor);
}
