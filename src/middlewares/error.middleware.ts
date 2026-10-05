import { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : 'Internal server error';

  response.status(statusCode).json({
    success: false,
    message,
  });
};