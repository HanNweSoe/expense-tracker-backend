import { db } from '../config/db';

export type CategoryType = 'expense' | 'income';

export interface Category {
  id: number;
  userId: number | null;
  name: string;
  type: CategoryType;
  targetBudget: string | null;
  createdAt: Date;
}

const categoryColumns = `
  categories.id,
  categories.user_id AS "userId",
  categories.name,
  categories.type,
  COALESCE(overrides.target_budget, categories.target_budget)::TEXT AS "targetBudget",
  categories.created_at AS "createdAt"
`;

const withUserOverride = `
  FROM categories
  LEFT JOIN category_budget_overrides AS overrides
    ON overrides.category_id = categories.id
   AND overrides.user_id = $1
`;

export const categoryModel = {
  findByUser: async (userId: number): Promise<Category[]> => {
    const result = await db.query<Category>(
      `SELECT ${categoryColumns}
       ${withUserOverride}
       WHERE categories.user_id = $1 OR categories.user_id IS NULL
       ORDER BY categories.name`,
      [userId],
    );
    return result.rows;
  },

  findAccessibleById: async (userId: number, categoryId: number): Promise<Category | undefined> => {
    const result = await db.query<Category>(
      `SELECT ${categoryColumns}
       ${withUserOverride}
       WHERE categories.id = $2
         AND (categories.user_id = $1 OR categories.user_id IS NULL)
       LIMIT 1`,
      [userId, categoryId],
    );
    return result.rows[0];
  },

  findAccessibleByName: async (userId: number, name: string): Promise<Category | undefined> => {
    const result = await db.query<Category>(
      `SELECT ${categoryColumns}
       ${withUserOverride}
       WHERE (categories.user_id = $1 OR categories.user_id IS NULL)
         AND LOWER(categories.name) = LOWER($2)
       ORDER BY categories.user_id NULLS LAST
       LIMIT 1`,
      [userId, name],
    );
    return result.rows[0];
  },

  nameTaken: async (userId: number, name: string, excludeId?: number): Promise<boolean> => {
    const result = await db.query(
      `SELECT 1
       FROM categories
       WHERE (user_id = $1 OR user_id IS NULL)
         AND LOWER(name) = LOWER($2)
         AND ($3::INTEGER IS NULL OR id <> $3)
       LIMIT 1`,
      [userId, name, excludeId ?? null],
    );
    return (result.rowCount ?? 0) > 0;
  },

  create: async (
    userId: number,
    name: string,
    targetBudget: string,
    type: CategoryType = 'expense',
  ): Promise<Category> => {
    const result = await db.query<Category>(
      `INSERT INTO categories (user_id, name, type, target_budget)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         user_id AS "userId",
         name,
         type,
         target_budget::TEXT AS "targetBudget",
         created_at AS "createdAt"`,
      [userId, name, type, targetBudget],
    );
    return result.rows[0];
  },

  updateOwned: async (
    userId: number,
    categoryId: number,
    name: string,
    targetBudget: string,
  ): Promise<Category | undefined> => {
    const result = await db.query<Category>(
      `UPDATE categories
       SET name = $3, target_budget = $4
       WHERE id = $2 AND user_id = $1
       RETURNING
         id,
         user_id AS "userId",
         name,
         type,
         target_budget::TEXT AS "targetBudget",
         created_at AS "createdAt"`,
      [userId, categoryId, name, targetBudget],
    );
    return result.rows[0];
  },

  deleteOwned: async (userId: number, categoryId: number): Promise<Category | undefined> => {
    const result = await db.query<Category>(
      `DELETE FROM categories
       WHERE id = $2 AND user_id = $1
       RETURNING
         id,
         user_id AS "userId",
         name,
         type,
         target_budget::TEXT AS "targetBudget",
         created_at AS "createdAt"`,
      [userId, categoryId],
    );
    return result.rows[0];
  },

  upsertBudgetOverride: async (
    userId: number,
    categoryId: number,
    targetBudget: string,
  ): Promise<void> => {
    await db.query(
      `INSERT INTO category_budget_overrides (user_id, category_id, target_budget)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, category_id)
       DO UPDATE SET
         target_budget = EXCLUDED.target_budget,
         updated_at = NOW()`,
      [userId, categoryId, targetBudget],
    );
  },
};
