import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Type, mixin } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type Plain = Record<string, any>;

function toPlain(value: any): any {
  if (value && typeof value.toObject === 'function') {
    // Mongoose Document -> plain object (kèm virtuals nếu có)
    return value.toObject({ virtuals: true });
  }
  return value;
}

function deepOmit(value: any, omitSet: Set<string>): any {
  if (Array.isArray(value)) {
    return value.map((v) => deepOmit(v, omitSet));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const plain = toPlain(value);
    if (Array.isArray(plain)) return deepOmit(plain, omitSet);

    const result: Plain = {};
    for (const [k, v] of Object.entries(plain ?? {})) {
      if (omitSet.has(k)) continue;
      result[k] = deepOmit(v, omitSet);
    }
    return result;
  }
  return value;
}

/**
 * Tạo interceptor loại bỏ các field nhạy cảm.
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
