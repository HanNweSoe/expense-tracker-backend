import { RequestHandler } from 'express';
import { userService } from '../services/user.service';

export const getUsers: RequestHandler = async (_request, response, next) => {
  try {
    response.json({ success: true, data: await userService.listUsers() });
  } catch (error) {
    next(error);
  }
};

export const createUser: RequestHandler = async (request, response, next) => {
  try {
    const { nickname } = request.body as { nickname?: unknown };
    const user = await userService.createUser(
      typeof nickname === 'string' ? nickname : '',
    );

    response.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
