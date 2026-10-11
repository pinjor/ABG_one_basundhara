import "reflect-metadata";
import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ValidationError } from "class-validator";
import * as classTransformer from "class-transformer";
import { AppModule } from "./app.module";

/**
 * On Windows the drive letter can be `D:` in one require path and `d:` in another.
 * Node then loads @nestjs/common twice, so `instanceof HttpException` fails in Nest's
 * filter and every application exception becomes a generic 500. Match by behaviour.
 */
@Catch()
class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpErrorFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const withStatus = exception as { getStatus?: () => number; getResponse?: () => unknown; message?: string; stack?: string };
    const status = typeof withStatus?.getStatus === "function" ? withStatus.getStatus() : 500;
    if (status >= 500) this.logger.error(withStatus?.message ?? "Unhandled error", withStatus?.stack);
    const raw = typeof withStatus?.getResponse === "function" ? withStatus.getResponse() : undefined;
    const body =
      typeof raw === "string"
        ? { statusCode: status, message: raw }
        : raw && typeof raw === "object"
          ? raw
          : { statusCode: status, message: status === 500 ? "Internal server error" : "Request failed" };
    response.status(status).json(body);
  }
}

function flattenValidation(errors: ValidationError[], prefix = ""): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) messages.push(...Object.values(error.constraints).map((message) => `${path}: ${message}`));
    if (error.children?.length) messages.push(...flattenValidation(error.children, path));
  }
  return messages.length ? messages : ["Invalid request"];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      // Same class-transformer instance the DTOs decorated. A second copy
      // (drive-letter case on Windows) drops @Type metadata and rejects nested fields.
      transformerPackage: classTransformer,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          statusCode: 400,
          message: flattenValidation(errors),
          error: "Bad Request",
        }),
    }),
  );
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`BSC API listening on :${port}`);
}
bootstrap();
