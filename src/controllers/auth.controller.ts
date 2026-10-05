import { RequestHandler } from 'express';
import { authService } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';

export const login: RequestHandler = async (request, response, next) => {
  try {
    const { nickname } = request.body as { nickname?: unknown };
    console.log('Login request', nickname);
    const result = await authService.login(
      typeof nickname === 'string' ? nickname : '',
    );
    console.log('Login result', result);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getMe: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user) {
      throw new ApiError(401, 'Authentication required');
    }

    response.json({ success: true, data: request.user });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (request, response, next) => {
  try {
    const authorization = request.header('authorization');
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    await authService.logout(token);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};
