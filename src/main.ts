import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { CorrelationInterceptor } from './common/interceptors/correlation.interceptor';
import { HttpErrorFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalInterceptors(new CorrelationInterceptor());

  // Swagger/OpenAPI configuration
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Orders API')
    .setDescription('Orders service demo')
    .setVersion('1.0')
    .build();
  const swaggerApp = app as unknown as Record<string, unknown>;
  const document = SwaggerModule.createDocument(
    swaggerApp as never,
    swaggerConfig,
  );
  SwaggerModule.setup('/api', swaggerApp as never, document);
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

  await app.listen(3000);
}
void bootstrap();
