import { db } from '../config/db';

export interface Expense {
  id: number;
  userId: number;
  categoryId: number | null;
  categoryName: string | null;
  merchant: string;
  amount: string;
  date: string;
  createdAt: Date;
}

export interface ExpenseReport {
  month: string;
  total: string;
  transactionCount: number;
  byCategory: Array<{
    categoryId: number | null;
    categoryName: string;
    total: string;
  }>;
}

export interface WeeklyTotal {
  dayOfWeek: number;
  total: string;
}

const expenseColumns = `
  e.id,
  e.user_id AS "userId",
  e.category_id AS "categoryId",
  c.name AS "categoryName",
  e.merchant,
  e.amount::TEXT AS amount,
  e.spent_at AS date,
  e.created_at AS "createdAt"
`;

export const expenseModel = {
  findByUser: async (userId: number): Promise<Expense[]> => {
    const result = await db.query<Expense>(
      `SELECT ${expenseColumns}
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1
       ORDER BY e.spent_at DESC, e.id DESC`,
      [userId],
    );
    return result.rows;
  },

  findRecent: async (userId: number, limit = 6): Promise<Expense[]> => {
    const result = await db.query<Expense>(
      `SELECT ${expenseColumns}
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1
       ORDER BY e.spent_at DESC, e.id DESC
       LIMIT $2`,
      [userId, limit],
    );
    return result.rows;
  },

  getWeeklyTotals: async (userId: number): Promise<WeeklyTotal[]> => {
    const result = await db.query<WeeklyTotal>(
      `SELECT EXTRACT(ISODOW FROM spent_at)::INT AS "dayOfWeek",
              COALESCE(SUM(amount), 0)::TEXT AS total
       FROM expenses
       WHERE user_id = $1
         AND spent_at >= date_trunc('week', CURRENT_DATE)::DATE
         AND spent_at < (date_trunc('week', CURRENT_DATE)::DATE + INTERVAL '7 days')
       GROUP BY 1
       ORDER BY 1`,
      [userId],
    );
    return result.rows;
  },

  countByUser: async (userId: number): Promise<number> => {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*)::TEXT AS count FROM expenses WHERE user_id = $1',
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  },

  getMonthlyReport: async (userId: number, month: string): Promise<ExpenseReport> => {
    const [totalResult, categoryResult] = await Promise.all([
      db.query<{ total: string; transactionCount: string }>(
        `SELECT
           COALESCE(SUM(amount), 0)::TEXT AS total,
           COUNT(*)::TEXT AS "transactionCount"
         FROM expenses
         WHERE user_id = $1
           AND spent_at >= $2::DATE
           AND spent_at < ($2::DATE + INTERVAL '1 month')`,
        [userId, `${month}-01`],
      ),
      db.query<ExpenseReport['byCategory'][number]>(
        `SELECT
           e.category_id AS "categoryId",
           COALESCE(c.name, 'Uncategorized') AS "categoryName",
           SUM(e.amount)::TEXT AS total
         FROM expenses e
         LEFT JOIN categories c ON c.id = e.category_id
         WHERE e.user_id = $1
           AND e.spent_at >= $2::DATE
           AND e.spent_at < ($2::DATE + INTERVAL '1 month')
         GROUP BY e.category_id, c.name
         ORDER BY SUM(e.amount) DESC, "categoryName" ASC`,
        [userId, `${month}-01`],
      ),
    ]);

    return {
      month,
      total: totalResult.rows[0].total,
      transactionCount: Number(totalResult.rows[0].transactionCount),
      byCategory: categoryResult.rows,
    };
  },

  create: async (
    userId: number,
    categoryId: number | null,
    merchant: string,
    amount: string,
    date: string,
  ): Promise<Expense> => {
    const result = await db.query<Expense>(
      `WITH inserted AS (
         INSERT INTO expenses (user_id, category_id, merchant, amount, spent_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *
       )
       SELECT ${expenseColumns}
       FROM inserted e
       LEFT JOIN categories c ON c.id = e.category_id`,
      [userId, categoryId, merchant, amount, date],
    );
    return result.rows[0];
  },

  remove: async (userId: number, expenseId: number): Promise<boolean> => {
    const result = await db.query(
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
      [expenseId, userId],
    );
    return result.rowCount === 1;
  },
};
