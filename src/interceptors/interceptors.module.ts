import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RewriteInterceptor } from './rewrite.intercepter';
import { CustomInterceptor } from './customer.interceptor';

@Module({
  providers: [
   // { provide: APP_INTERCEPTOR, useClass: RewriteInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CustomInterceptor }
  ],
})
export class InterceptorModule {}