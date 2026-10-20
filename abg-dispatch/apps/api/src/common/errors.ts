import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Errors carry a stable `code` for clients (the mobile app branches on it) and a
 * human sentence that says what went wrong and, where possible, how to fix it.
 */
export class DomainError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: Record<string, unknown>) {
    super({ statusCode: status, code, message, ...(details ? { details } : {}) }, status);
  }
}

export const conflict = (code: string, message: string, details?: Record<string, unknown>) =>
  new DomainError(HttpStatus.CONFLICT, code, message, details);
export const forbidden = (message: string, code = "FORBIDDEN") => new DomainError(HttpStatus.FORBIDDEN, code, message);
export const notFound = (message: string, code = "NOT_FOUND") => new DomainError(HttpStatus.NOT_FOUND, code, message);
export const badRequest = (message: string, code = "BAD_REQUEST", details?: Record<string, unknown>) =>
  new DomainError(HttpStatus.BAD_REQUEST, code, message, details);
export const unauthorized = (message: string, code = "UNAUTHORIZED", details?: Record<string, unknown>) =>
  new DomainError(HttpStatus.UNAUTHORIZED, code, message, details);
export const tooMany = (message: string, code = "RATE_LIMITED") => new DomainError(HttpStatus.TOO_MANY_REQUESTS, code, message);

/** Shown for any parcel the caller may not see, so tracking numbers can't be probed. */
export const PARCEL_NOT_FOUND = "Parcel not found, or you do not have access to it.";
