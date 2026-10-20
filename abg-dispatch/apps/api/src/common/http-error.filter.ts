import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";

/** Normalises every error to { statusCode, code, message } and never leaks stack traces. */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpErrorFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const e = exception as { getStatus?: () => number; getResponse?: () => unknown; message?: string; stack?: string; code?: string };
    let status = typeof e?.getStatus === "function" ? e.getStatus() : 500;
    let body: Record<string, unknown>;

    // Database guards (append-only ledger, transition trigger) surface as Prisma errors.
    const dbMessage = String(e?.message ?? "");
    if (status === 500 && /append-only|Invalid parcel status transition/.test(dbMessage)) {
      status = 409;
      body = { statusCode: 409, code: "LEDGER_GUARD", message: "That change is not allowed by the custody ledger." };
    } else if (typeof e?.getResponse === "function") {
      const raw = e.getResponse();
      body = typeof raw === "string" ? { statusCode: status, message: raw } : { ...(raw as Record<string, unknown>) };
    } else {
      body = { statusCode: 500, code: "INTERNAL", message: "The server could not complete this request. It has been logged." };
    }
    if (status >= 500) this.logger.error(e?.message ?? "Unhandled error", e?.stack);
    if (!body.code) body.code = defaultCode(status);
    response.status(status).json(body);
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case 400: return "VALIDATION";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 413: return "PAYLOAD_TOO_LARGE";
    case 429: return "RATE_LIMITED";
    default: return status >= 500 ? "INTERNAL" : "ERROR";
  }
}
