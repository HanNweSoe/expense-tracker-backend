import { Router } from 'express';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../controllers/category.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const categoryRoutes = Router();

categoryRoutes.use(requireAuth);
categoryRoutes.get('/', getCategories);
categoryRoutes.post('/', createCategory);
categoryRoutes.patch('/:categoryId', updateCategory);
categoryRoutes.delete('/:categoryId', deleteCategory);

export default categoryRoutes;