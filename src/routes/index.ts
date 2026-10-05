import { Router } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import expenseRoutes from './expense.routes';
import userRoutes from './user.routes';

const routes = Router();

routes.get('/health', (_request, response) => {
  response.json({ success: true, message: 'API is healthy' });
});
routes.use('/auth', authRoutes);
routes.use('/categories', categoryRoutes);
routes.use('/users', userRoutes);
routes.use('/expenses', expenseRoutes);

export default routes;