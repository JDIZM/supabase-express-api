export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.name = "HttpError";
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return "BAD_REQUEST";
      case 401:
        return "UNAUTHORIZED";
      case 403:
        return "FORBIDDEN";
      case 404:
        return "NOT_FOUND";
      case 409:
        return "CONFLICT";
      case 422:
        return "UNPROCESSABLE_ENTITY";
      case 429:
        return "TOO_MANY_REQUESTS";
      case 500:
        return "INTERNAL_SERVER_ERROR";
      default:
        return "UNKNOWN_ERROR";
    }
  }

  public toResponse(): { statusCode: number; code: string; message: string } {
    return {
      statusCode: this.statusCode,
      code: this.code,
      message: this.message
    };
  }
}

// Common HTTP error types with predefined status codes and error codes
export const HttpErrors = {
  // 400 Bad Request
  BadRequest: (message: string = "Bad Request") => new HttpError(400, message, "BAD_REQUEST"),
  InvalidInput: (message: string = "Invalid input provided") => new HttpError(400, message, "INVALID_INPUT"),
  ValidationFailed: (message: string = "Validation failed") => new HttpError(400, message, "VALIDATION_FAILED"),
  MissingParameter: (parameter: string) =>
    new HttpError(400, `Missing required parameter: ${parameter}`, "MISSING_PARAMETER"),

  // 401 Unauthorized
  Unauthorized: (message: string = "Authentication required") => new HttpError(401, message, "UNAUTHORIZED"),
  InvalidToken: (message: string = "Invalid or expired token") => new HttpError(401, message, "INVALID_TOKEN"),

  // 403 Forbidden
  Forbidden: (message: string = "Access denied") => new HttpError(403, message, "FORBIDDEN"),
  InsufficientPermissions: (message: string = "Insufficient permissions") =>
    new HttpError(403, message, "INSUFFICIENT_PERMISSIONS"),
  AccountInactive: (status: string) => new HttpError(403, `Account is ${status}`, "ACCOUNT_INACTIVE"),

  // 404 Not Found
  NotFound: (resource: string = "Resource") => new HttpError(404, `${resource} not found`, "NOT_FOUND"),
  AccountNotFound: () => new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND"),
  WorkspaceNotFound: () => new HttpError(404, "Workspace not found", "WORKSPACE_NOT_FOUND"),

  // 409 Conflict
  Conflict: (message: string = "Resource conflict") => new HttpError(409, message, "CONFLICT"),

  // 422 Unprocessable Entity
  UnprocessableEntity: (message: string = "Unable to process request") =>
    new HttpError(422, message, "UNPROCESSABLE_ENTITY"),

  // 500 Internal Server Error
  InternalError: (message: string = "Internal server error") => new HttpError(500, message, "INTERNAL_SERVER_ERROR"),
  DatabaseError: (message: string = "Database operation failed") => new HttpError(500, message, "DATABASE_ERROR")
} as const;

// Helper function to handle HttpError in Express handlers
export function handleHttpError(
  error: HttpError,
  res: { status: (code: number) => { send: (data: unknown) => void } },
  gatewayResponse: () => { error: (statusCode: number, error: Error, message: string) => { code: number } }
): void {
  const response = gatewayResponse().error(error.statusCode, error, error.message);
  res.status(response.code).send(response);
}
