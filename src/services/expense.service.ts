import { expenseModel } from '../models/expense.model';
import { categoryModel } from '../models/category.model';
import { userModel } from '../models/user.model';
import { ApiError } from '../utils/ApiError';
import {
  categoryBudget,
  categoryLabel,
  daysLeftInMonth,
  formatExpenseTime,
  iconForCategory,
  monthLabel,
  previousMonthKey,
  roundMoney,
  toAmount,
} from '../utils/finance';

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const CATEGORY_ALIASES: Record<string, string> = {
  'food & dining': 'food',
  'food & drinks': 'food',
  'food & groceries': 'food',
  dining: 'food',
  groceries: 'food',
  'cafes & treats': 'food',
  transport: 'transportation',
  commute: 'transportation',
  'commute & travel': 'transportation',
  'bills & rent': 'bills',
  'health & care': 'health',
  'wellness & care': 'health',
  'fun & entertainment': 'entertainment',
  fun: 'entertainment',
  'personal & shopping': 'shopping',
};

const resolveCategoryId = async (userId: number, categoryId: number | string | null) => {
  if (categoryId === null) {
    throw new ApiError(400, 'Category is required');
  }

  if (typeof categoryId === 'number') {
    if (!isPositiveInteger(categoryId)) {
      throw new ApiError(400, 'category must be a positive integer or category name');
    }
    return categoryId;
  }

  const categoryName = categoryId.trim();
  if (!categoryName) {
    throw new ApiError(400, 'category must be a positive integer or category name');
  }

  const lookupNames = [categoryName];
  const alias = CATEGORY_ALIASES[categoryName.toLowerCase()];
  if (alias) {
    lookupNames.push(alias);
  }

  for (const name of lookupNames) {
    const category = await categoryModel.findAccessibleByName(userId, name);
    if (category) {
      return category.id;
    }
  }

  throw new ApiError(400, `Category '${categoryName}' was not found`);
};

const requireUserId = (userId: number) => {
  if (!isPositiveInteger(userId)) {
    throw new ApiError(400, 'A valid userId is required');
  }
};

const resolveMonth = (month?: string) => {
  const requestedMonth = month ?? new Date().toISOString().slice(0, 7);
  if (!monthPattern.test(requestedMonth)) {
    throw new ApiError(400, 'month must use YYYY-MM format');
  }
  return requestedMonth;
};

const sumTargetBudget = (
  categories: Array<{ name: string; type: string; targetBudget: string | null }>,
) =>
  roundMoney(
    categories
      .filter((category) => category.type !== 'income')
      .reduce((sum, category) => sum + categoryBudget(category.name, category.targetBudget), 0),
  );

export const expenseService = {
  listExpenses: async (userId: number) => {
    requireUserId(userId);
    return expenseModel.findByUser(userId);
  },

  getMonthlyReport: async (userId: number, month?: string) => {
    requireUserId(userId);
    const requestedMonth = resolveMonth(month);
    const lastMonth = previousMonthKey(requestedMonth);

    const [current, previous, categories] = await Promise.all([
      expenseModel.getMonthlyReport(userId, requestedMonth),
      expenseModel.getMonthlyReport(userId, lastMonth),
      categoryModel.findByUser(userId),
    ]);

    const spent = toAmount(current.total);
    const lastMonthSpent = toAmount(previous.total);
    const budget = sumTargetBudget(categories);
    const remaining = roundMoney(Math.max(budget - spent, 0));
    const outflowChangePercent = lastMonthSpent === 0
      ? 0
      : roundMoney(((spent - lastMonthSpent) / lastMonthSpent) * 100);

    const byCategory = current.byCategory.map((item) => {
      const amount = toAmount(item.total);
      return {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        displayName: categoryLabel(item.categoryName),
        total: amount,
        percent: spent > 0 ? Math.round((amount / spent) * 100) : 0,
      };
    });

    const spentByName = new Map(
      current.byCategory.map((item) => [item.categoryName.toLowerCase(), toAmount(item.total)]),
    );

    const categoriesWithSpend = categories
      .filter((category) => category.type !== 'income')
      .map((category) => {
        const target = categoryBudget(category.name, category.targetBudget);
        const categorySpent = spentByName.get(category.name.toLowerCase()) ?? 0;
        return {
          id: category.id,
          userId: category.userId,
          isDefault: category.userId === null,
          name: category.name,
          displayName: categoryLabel(category.name),
          targetBudget: target,
          spent: categorySpent,
          remaining: roundMoney(Math.max(target - categorySpent, 0)),
          percentSpent: target > 0 ? Math.min(Math.round((categorySpent / target) * 100), 100) : 0,
        };
      });

    return {
      month: requestedMonth,
      monthLabel: monthLabel(requestedMonth),
      total: spent,
      spentOutflow: spent,
      lastMonthSpent,
      outflowChangePercent,
      totalBudget: budget,
      remaining,
      percentSaved: budget > 0 ? roundMoney((remaining / budget) * 100) : 0,
      savingsGoalPercent: 40,
      daysLeft: daysLeftInMonth(requestedMonth),
      safeDailySpend: roundMoney(remaining / daysLeftInMonth(requestedMonth)),
      transactionCount: current.transactionCount,
      byCategory,
      categories: categoriesWithSpend,
    };
  },

  getDashboard: async (userId: number) => {
    requireUserId(userId);

    const [user, report, weeklyTotals, recent, expenseCount] = await Promise.all([
      userModel.findById(userId),
      expenseService.getMonthlyReport(userId),
      expenseModel.getWeeklyTotals(userId),
      expenseModel.findRecent(userId, 6),
      expenseModel.countByUser(userId),
    ]);

    const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totalsByDay = new Map(
      weeklyTotals.map((item) => [Number(item.dayOfWeek), toAmount(item.total)]),
    );
    const todayIndex = ((new Date().getDay() + 6) % 7) + 1;
    const weeklyDays = weekdayLabels.map((label, index) => {
      const dayOfWeek = index + 1;
      return {
        label,
        value: roundMoney(totalsByDay.get(dayOfWeek) ?? 0),
        highlighted: dayOfWeek === todayIndex,
      };
    });
    const totalThisWeek = roundMoney(weeklyDays.reduce((sum, day) => sum + day.value, 0));

    const percentPlump = report.totalBudget > 0
      ? Math.round((report.spentOutflow / report.totalBudget) * 100)
      : 0;

    const level = Math.min(1 + Math.floor(expenseCount / 8), 9);

    return {
      user: {
        id: user?.id ?? userId,
        nickname: user?.nickname ?? 'Sprout',
      },
      greeting: `Hello, ${user?.nickname ?? 'Sprout'}!`,
      subtitle: 'Your garden is thriving today.',
      levelLabel: `LEVEL ${level} SPROUT`,
      monthly: {
        title: 'Monthly Sprout',
        spent: report.spentOutflow,
        budget: report.totalBudget,
        percentPlump,
        remaining: report.remaining,
        statusMessage: percentPlump < 80 ? 'Looking healthy!' : 'Water those savings carefully.',
      },
      weekly: {
        title: 'Weekly Rhythm',
        totalThisWeek,
        days: weeklyDays,
      },
      recentExpenses: recent.map((expense) => ({
        id: String(expense.id),
        title: expense.merchant,
        category: categoryLabel(expense.categoryName),
        time: formatExpenseTime(expense.date, expense.createdAt),
        amount: toAmount(expense.amount),
        iconName: iconForCategory(expense.categoryName),
      })),
      sproutySays: {
        quote: report.remaining > 0
          ? `You've still got room to grow. ${Math.round(report.remaining)} left this month.`
          : 'Budget is fully planted this month. Time to pause and bloom.',
      },
    };
  },

  createExpense: async ({
    userId,
    categoryId,
    merchant,
    amount,
    date,
  }: {
    userId: number;
    categoryId: number | string | null;
    merchant: string;
    amount: string;
    date: string;
  }) => {
    if (!isPositiveInteger(userId)) {
      throw new ApiError(400, 'A valid userId is required');
    }

    if (!merchant || merchant.length > 200) {
      throw new ApiError(400, 'Merchant is required and must be 200 characters or fewer');
    }

    if (!amount || !amountPattern.test(amount) || Number(amount) <= 0) {
      throw new ApiError(400, 'Amount must be a positive number with up to two decimals');
    }

    const resolvedCategoryId = await resolveCategoryId(userId, categoryId);

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ApiError(400, 'date must be a valid date');
    }

    const databaseDate = parsedDate.toISOString().slice(0, 10);

    return expenseModel.create(userId, resolvedCategoryId, merchant, amount, databaseDate);
  },
};
