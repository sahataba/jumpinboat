export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export const getErrorStatusCode = (error: unknown, fallback = 500) =>
  error instanceof ApiError ? error.statusCode : fallback;

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;
