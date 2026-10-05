import { Router } from 'express';
import { getMe, login, logout } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.get('/me', requireAuth, getMe);
authRoutes.post('/logout', requireAuth, logout);

export default authRoutes;