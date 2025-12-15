import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { IRequestWithTenant } from '../interfaces/irequest-with-tenant.interface';

export const correlationStorage = new AsyncLocalStorage<{ traceId: string }>();

@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const http = ctx.switchToHttp();
    const req = http.getRequest<IRequestWithTenant>();
    const traceId = req.get('x-request-id') ?? randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const res = http.getResponse();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    res.setHeader('X-Request-ID', traceId);
    return correlationStorage.run({ traceId }, () => next.handle());
  }
}
