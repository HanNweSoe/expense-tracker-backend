import { Router } from 'express';
import { createExpense, getDashboard, getExpenseReport, getExpenses, scanExpenses } from '../controllers/expense.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const expenseRoutes = Router();

expenseRoutes.use(requireAuth);
expenseRoutes.get('/', getExpenses);
expenseRoutes.get('/dashboard', getDashboard);
expenseRoutes.get('/report', getExpenseReport);
expenseRoutes.post('/', createExpense);
expenseRoutes.post('/scan', scanExpenses);

export default expenseRoutes;