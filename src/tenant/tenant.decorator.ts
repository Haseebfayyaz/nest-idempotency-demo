import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { IRequestWithTenant } from '../common/interfaces/irequest-with-tenant.interface';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const tenantId = ctx
      .switchToHttp()
      .getRequest<IRequestWithTenant>().tenantId;
    if (!tenantId) {
      throw new BadRequestException('X-Tenant-Id required');
    }
    return tenantId;
  },
);
