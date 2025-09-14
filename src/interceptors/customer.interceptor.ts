/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable prettier/prettier */
import { isValidDate } from '@/utils/utils';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export type RequestHandler = (request: Request, logger: Logger) => void;
export type ResponseHandler = (request: Request, response: Response, body: unknown, logger: Logger) => void;
export type ErrorHandler = (request: Request, error: Error, logger: Logger) => void;

function isValidDateTime(value: any): boolean {
  if (typeof value !== 'string') return false;
  const formats = [
    // ISO 8601
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[\+\-]\d{2}:\d{2})?$/,
    // "2024-06-04 12:00:00"
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    // "2024-06-04"
    /^\d{4}-\d{2}-\d{2}$/,
    // "06/04/2024" or "06-04-2024"
    /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/,
    // GMT/UTC formats
    /^[a-zA-Z]{3}, \d{2} [a-zA-Z]{3} \d{4} \d{2}:\d{2}:\d{2} (GMT|UTC)([\+\-]\d{4})?$/,
    /^[a-zA-Z]{3}, \d{2} [a-zA-Z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT [A-Za-z ]+$/,
    /^[a-zA-Z]{3} [a-zA-Z]{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[\+\-]\d{4} \([^)]+\)$/,
  ];
  const matchesFormat = formats.some((regex) => regex.test(value));
  if (!matchesFormat) return false;
  const parsedDate = Date.parse(value);
  return !isNaN(parsedDate);
}

const toDate = (str: string): Date => new Date(Date.parse(str));

function convertDatesToISO<T extends object>(obj: T): any {
  // Nếu obj là mảng, duyệt từng phần tử để chuyển đổi
  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null ? convertDatesToISO(item as Record<string, unknown>) : item
    );
  }

  // Nếu obj là một object, duyệt qua các key của nó
  const result = {} as Record<keyof T, any>;
  (Object.keys(obj) as (keyof T)[]).forEach(key => {
    const value = obj[key];

    // Nếu giá trị là Date hoặc chuỗi hợp lệ biểu diễn ngày, chuyển đổi sang ISO
    if (value instanceof Date || isValidDateTime(value)) {
      result[key] = toDate(value as string).toISOString();
    }
    // Nếu giá trị là mảng, duyệt lại từng phần tử của mảng
    else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null ? convertDatesToISO(item as Record<string, unknown>) : item
      );
    }
    // Nếu giá trị là một object (không null), gọi đệ qui để chuyển đổi bên trong
    else if (typeof value === 'object' && value !== null) {
      result[key] = convertDatesToISO(value);
    }
    // Các giá trị khác không cần xử lý
    else {
      result[key] = value;
    }
  });
  return result;
}


export const defaultRequestHandler: RequestHandler = (request, logger) => {
  if (request.query && request.query !== null) {
    // Convert dates in query parameters to ISO format
    request.query = convertDatesToISO(request.query);
  }
  if (request.body && request.body !== null) {
    // Convert dates in request body to ISO format
    request.body = convertDatesToISO(request.body);
  }
};

export const defaultResponseHandler: ResponseHandler = (
  request,
  response,
  _body,
  logger,
) => {
  logger.log(`RESPONSE: ${request.method} ${request.url} => ${response.statusCode}`);
};

export const defaultErrorHandler: ErrorHandler = (request, error, logger) => {
  if (error instanceof HttpException) {
    const statusCode = error.getStatus();
    const message = `ERROR: ${request.method} ${request.url} => ${statusCode}`;
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      logger.error({ message, error }, error.stack);
    } else {
      logger.warn({ message, error });
    }
  } else {
    logger.error({ message: `ERROR: ${request.method} ${request.url}` }, error.stack);
  }
};

export type LoggingInterceptorConfig = {
  requestHandler: RequestHandler | null;
  responseHandler: ResponseHandler | null;
  errorHandler: ErrorHandler | null;
  context: string;
};

/**
 * Interceptor that logs input/output requests
 */
@Injectable()
export class CustomInterceptor implements NestInterceptor {
  private readonly logger: Logger;
  private readonly config: LoggingInterceptorConfig;

  constructor(@Optional() config?: Partial<LoggingInterceptorConfig> | string) {
    const partialConfig: Partial<LoggingInterceptorConfig> =
      typeof config === 'string' ? { context: config } : { ...config };
    this.config = {
      ...partialConfig,
      requestHandler: partialConfig.requestHandler ?? defaultRequestHandler,
      responseHandler: partialConfig.responseHandler ?? defaultResponseHandler,
      errorHandler: partialConfig.errorHandler ?? defaultErrorHandler,
      context: partialConfig.context || CustomInterceptor.name,
    };
    this.logger = new Logger(this.config.context);
  }

  public intercept(context: ExecutionContext, callHandler: CallHandler): Observable<unknown> {
    if (this.config.requestHandler) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const request = context.switchToHttp().getRequest();
      this.config.requestHandler(request, this.logger);
    }
    return callHandler.handle().pipe(
      tap({
        next: (val: unknown): void => this.logNext(val, context),
        error: (err: Error): void => this.logError(err, context),
      }),
    );
  }

  private logNext(body: unknown, context: ExecutionContext): void {
    if (this.config.responseHandler) {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();
      this.config.responseHandler(request, response, body, this.logger);
    }
  }

  private logError(error: Error, context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest<Request>();
    if (this.config.errorHandler) {
      this.config.errorHandler(request, error, this.logger);
    }
  }
}
