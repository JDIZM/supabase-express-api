/**
 * HTTP status codes as const enum for type safety
 */
export const HttpStatusCode = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;

export type HttpStatusCode = (typeof HttpStatusCode)[keyof typeof HttpStatusCode];

/**
 * Error codes as const for type safety and autocomplete
 */
export const ErrorCode = {
  // 400 errors
  BAD_REQUEST: "BAD_REQUEST",
  INVALID_INPUT: "INVALID_INPUT",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  MISSING_PARAMETER: "MISSING_PARAMETER",

  // 401 errors
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",

  // 403 errors
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

  // 404 errors
  NOT_FOUND: "NOT_FOUND",

  // 409 errors
  CONFLICT: "CONFLICT",

  // 422 errors
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",

  // 429 errors
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // 500 errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",

  // Unknown
  UNKNOWN_ERROR: "UNKNOWN_ERROR"
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Custom HTTP Error class with status codes and error codes
 */
export class HttpError extends Error {
  public readonly code: HttpStatusCode;
  public readonly error: ErrorCode;

  constructor(code: HttpStatusCode, message: string, error?: ErrorCode) {
    super(message);
    this.code = code;
    this.error = error || this.getDefaultCode(code);
    this.name = "HttpError";
  }

  private getDefaultCode(code: HttpStatusCode): ErrorCode {
    switch (code) {
      case HttpStatusCode.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatusCode.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatusCode.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatusCode.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatusCode.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatusCode.UNPROCESSABLE_ENTITY:
        return ErrorCode.UNPROCESSABLE_ENTITY;
      case HttpStatusCode.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      case HttpStatusCode.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      default:
        return ErrorCode.UNKNOWN_ERROR;
    }
  }

  public toResponse(): { code: HttpStatusCode; error: ErrorCode; message: string } {
    return {
      code: this.code,
      error: this.error,
      message: this.message
    };
  }
}

/**
 * Common HTTP error factory functions with predefined status codes
 */
export const HttpErrors = {
  // 400 Bad Request
  BadRequest: (message = "Bad Request") => new HttpError(HttpStatusCode.BAD_REQUEST, message, ErrorCode.BAD_REQUEST),
  InvalidInput: (message = "Invalid input provided") =>
    new HttpError(HttpStatusCode.BAD_REQUEST, message, ErrorCode.INVALID_INPUT),
  ValidationFailed: (message = "Validation failed") =>
    new HttpError(HttpStatusCode.BAD_REQUEST, message, ErrorCode.VALIDATION_FAILED),
  MissingParameter: (parameter: string) =>
    new HttpError(HttpStatusCode.BAD_REQUEST, `Missing required parameter: ${parameter}`, ErrorCode.MISSING_PARAMETER),

  // 401 Unauthorized
  Unauthorized: (message = "Authentication required") =>
    new HttpError(HttpStatusCode.UNAUTHORIZED, message, ErrorCode.UNAUTHORIZED),
  InvalidToken: (message = "Invalid or expired token") =>
    new HttpError(HttpStatusCode.UNAUTHORIZED, message, ErrorCode.INVALID_TOKEN),

  // 403 Forbidden
  Forbidden: (message = "Access denied") => new HttpError(HttpStatusCode.FORBIDDEN, message, ErrorCode.FORBIDDEN),
  InsufficientPermissions: (message = "Insufficient permissions") =>
    new HttpError(HttpStatusCode.FORBIDDEN, message, ErrorCode.INSUFFICIENT_PERMISSIONS),

  // 404 Not Found
  NotFound: (resource = "Resource") =>
    new HttpError(HttpStatusCode.NOT_FOUND, `${resource} not found`, ErrorCode.NOT_FOUND),

  // 409 Conflict
  Conflict: (message = "Resource conflict") => new HttpError(HttpStatusCode.CONFLICT, message, ErrorCode.CONFLICT),

  // 422 Unprocessable Entity
  UnprocessableEntity: (message = "Unable to process request") =>
    new HttpError(HttpStatusCode.UNPROCESSABLE_ENTITY, message, ErrorCode.UNPROCESSABLE_ENTITY),

  // 429 Too Many Requests
  TooManyRequests: (message = "Too many requests") =>
    new HttpError(HttpStatusCode.TOO_MANY_REQUESTS, message, ErrorCode.TOO_MANY_REQUESTS),

  // 500 Internal Server Error
  InternalError: (message = "Internal server error") =>
    new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, message, ErrorCode.INTERNAL_SERVER_ERROR),
  DatabaseError: (message = "Database operation failed") =>
    new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, message, ErrorCode.DATABASE_ERROR)
} as const;
