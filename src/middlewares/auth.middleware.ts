import { RequestHandler } from 'express';
import { sessionModel } from '../models/session.model';
import { tokenHash } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: {
        id: number;
        nickname: string;
      };
    }
  }
}

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    console.log('requireAuth middleware called');
    const authorization = request.header('authorization');
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    const user = await sessionModel.findUserByTokenHash(tokenHash(token));
    if (!user) {
      throw new ApiError(401, 'Invalid or expired session');
    }

    request.userId = user.id;
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
};