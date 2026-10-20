import "reflect-metadata";
import { BadRequestException, INestApplication, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { ValidationError } from "class-validator";
import { AppModule } from "./app.module";
import { HttpErrorFilter } from "./common/http-error.filter";
import { loadConfig } from "./common/config";

function flatten(errors: ValidationError[], prefix = ""): string[] {
  const out: string[] = [];
  for (const e of errors) {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    if (e.constraints) out.push(...Object.values(e.constraints).map((m) => (m.startsWith(e.property) ? `${prefix ? `${prefix}.` : ""}${m}` : m)));
    if (e.children?.length) out.push(...flatten(e.children, path));
  }
  return out.length ? out : ["Invalid request"];
}

export function configureApp(app: INestApplication) {
  const config = loadConfig();
  const express = app as NestExpressApplication;
  express.set("trust proxy", 1);
  express.disable("x-powered-by");
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    credentials: false,
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "Accept-Language"],
    exposedHeaders: ["Idempotent-Replay", "Content-Disposition"],
  });
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });
  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flatten(errors);
        return new BadRequestException({ statusCode: 400, code: "VALIDATION", message: messages[0], details: { errors: messages } });
      },
    }),
  );
  return config;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true, bodyParser: true });
  app.useBodyParser("json", { limit: "2mb" });
  const config = configureApp(app);
  app.enableShutdownHooks();
  await app.listen(config.port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`ABG Dispatch API listening on :${config.port}`);
}

if (require.main === module) void bootstrap();
