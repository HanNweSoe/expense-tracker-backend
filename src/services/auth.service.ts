import { createHash, randomBytes } from 'node:crypto';
import { sessionModel } from '../models/session.model';
import { userModel } from '../models/user.model';
import { ApiError } from '../utils/ApiError';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const createSession = async (user: { id: number; nickname: string }) => {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await sessionModel.create(user.id, hashToken(token), expiresAt);

  return {
    token,
    expiresAt,
    user,
  };
};

export const authService = {
  login: async (nickname: string) => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname || trimmedNickname.length > 50) {
      throw new ApiError(400, 'Nickname is required and must be 50 characters or fewer');
    }

    let user = await userModel.findByNickname(trimmedNickname);
    if (!user) {
      try {
        user = await userModel.create(trimmedNickname);
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
          user = await userModel.findByNickname(trimmedNickname);
        } else {
          throw error;
        }
      }
    }

    if (!user) {
      throw new ApiError(500, 'Unable to start a session for this nickname');
    }

    return createSession(user);
  },

  logout: (token: string) => sessionModel.revoke(hashToken(token)),
};

export const tokenHash = hashToken;
