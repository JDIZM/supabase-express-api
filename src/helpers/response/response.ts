import { logger } from "../logger/logger.ts";

interface ErrorResponse {
  code: number;
  error: string;
  message: string;
}

interface SuccessResponse<T> {
  code: number;
  data: T;
  message: string;
}

interface ReturnType<T> {
  error: (code: number, error: Error, message: string) => ErrorResponse;
  success: (code: number, data: T, message?: string) => SuccessResponse<T>;
}

/**
 *
 * Create a response object with error and success methods
 *
 * @example success response
 * const response = gatewayResponse<{ data: string }>().success(200, { data: "data" });
 *
 * @example error response
 * const response = gatewayResponse().error(500, new Error("error"), "Internal Server Error");
 *
 */
export const gatewayResponse = <T>(): ReturnType<T> => {
  return {
    error: (code: number, error: Error, message: string) => {
      logger.error({ msg: message, err: error });

      return {
        code,
        error: error.message,
        message
      };
    },
    success: (code: number, data: T, message = "success") => {
      logger.info({ msg: message });

      return {
        code,
        data,
        message
      };
    }
  };
};
