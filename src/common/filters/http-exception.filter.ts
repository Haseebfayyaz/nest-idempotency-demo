import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const resBody = isHttp
      ? (exception.getResponse() as Record<string, unknown>)
      : { message: 'Internal server error' };

    const message =
      typeof resBody === 'string'
        ? resBody
        : (resBody.message as string) ?? 'Error';
    const code =
      (resBody as Record<string, string | undefined>)?.['code'] ??
      (isHttp ? exception.name : 'INTERNAL_ERROR');
    const details =
      typeof resBody === 'object' && !Array.isArray(resBody) ? resBody : {};

    response.status(status).json({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        details,
      },
    });
  }
}


