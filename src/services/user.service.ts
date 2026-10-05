import { userModel } from '../models/user.model';
import { ApiError } from '../utils/ApiError';

export const userService = {
  listUsers: () => userModel.findAll(),

  createUser: async (nickname: string) => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname || trimmedNickname.length > 50) {
      throw new ApiError(400, 'Nickname is required and must be 50 characters or fewer');
    }

    if (await userModel.findByNickname(trimmedNickname)) {
      throw new ApiError(409, 'This nickname is already taken');
    }

    try {
      return await userModel.create(trimmedNickname);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new ApiError(409, 'This nickname is already taken');
      }
      throw error;
    }
  },
};
