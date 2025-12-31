import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  Headers,
  UseGuards,
  Query,
  Get,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { TenantGuard } from '../../tenant/tenant.guard';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';

@Controller('/api/v1/orders')
@UseGuards(TenantGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @HttpCode(200)
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('idempotency-key') key: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    if (!key) {
      throw new BadRequestException('Idempotency-Key header required');
    }
    return this.service.createDraft(tenantId, key, body);
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('if-match') version: string,
    @Body() dto: ConfirmOrderDto,
  ) {
    const normalizedVersion = Number(String(version ?? '').replace(/"/g, ''));
    return this.service.confirm(id, tenantId, normalizedVersion, dto);
  }

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListOrdersDto,
  ) {
    return this.service.list(tenantId, query);
  }

  @Post(':id/close')
  @HttpCode(200)
  close(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.service.close(id, tenantId);
  }

  @Get('testApi')
  testApi(): string {
    const someVar = "no test";
    return void;
  }
}
