export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: Record<string, string> | undefined;
  public readonly captchaRequired: boolean | undefined;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    errors?: Record<string, string>,
    captchaRequired?: boolean,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

// specific error classes
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", captchaRequired?: boolean) {
    super(message, 401, true, undefined, captchaRequired);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", errors?: Record<string, string>) {
    super(message, 400, true, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429);
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super(message, 500, false); // non-operational = programming error
  }
}
