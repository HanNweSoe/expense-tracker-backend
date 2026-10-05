import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createUser, getUsers } from '../controllers/user.controller';

const userRoutes = Router();

userRoutes.post('/', createUser);
userRoutes.get('/', requireAuth, getUsers);

export default userRoutes;