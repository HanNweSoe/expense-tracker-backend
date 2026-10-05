import { categoryModel } from '../models/category.model';
import { ApiError } from '../utils/ApiError';

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;
const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const requireUserId = (userId: number) => {
  if (!isPositiveInteger(userId)) {
    throw new ApiError(400, 'A valid authenticated user is required');
  }
};

const normalizeName = (name: string) => name.trim();

const requireName = (name: string) => {
  if (!name || name.length > 100) {
    throw new ApiError(400, 'Category name is required and must be 100 characters or fewer');
  }
};

const requireTargetBudget = (targetBudget: string) => {
  if (!targetBudget || !amountPattern.test(targetBudget) || Number(targetBudget) <= 0) {
    throw new ApiError(400, 'Target budget must be a positive number with up to two decimals');
  }
};

const toConflictError = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    throw new ApiError(409, 'You already have a category with this name');
  }
  throw error;
};

export const categoryService = {
  listCategories: async (userId: number) => {
    requireUserId(userId);
    return categoryModel.findByUser(userId);
  },

  createCategory: async (userId: number, name: string, targetBudget: string) => {
    requireUserId(userId);
    const categoryName = normalizeName(name);
    requireName(categoryName);
    requireTargetBudget(targetBudget);

    if (await categoryModel.nameTaken(userId, categoryName)) {
      throw new ApiError(409, 'You already have a category with this name');
    }

    try {
      return await categoryModel.create(userId, categoryName, targetBudget);
    } catch (error) {
      toConflictError(error);
      throw error;
    }
  },

  updateCategory: async (
    userId: number,
    categoryId: number,
    name: string | undefined,
    targetBudget: string | undefined,
  ) => {
    requireUserId(userId);
    if (!isPositiveInteger(categoryId)) {
      throw new ApiError(400, 'A valid category id is required');
    }

    const existing = await categoryModel.findAccessibleById(userId, categoryId);
    if (!existing) {
      throw new ApiError(404, 'Category was not found');
    }

    const isDefault = existing.userId === null;
    const nextName = name === undefined ? existing.name : normalizeName(name);
    const nextBudget = targetBudget === undefined ? existing.targetBudget ?? '' : targetBudget.trim();

    if (isDefault) {
      if (name !== undefined && nextName.toLowerCase() !== existing.name.toLowerCase()) {
        throw new ApiError(400, 'Default categories can only change their target budget');
      }
      requireTargetBudget(nextBudget);
      await categoryModel.upsertBudgetOverride(userId, categoryId, nextBudget);
      const updatedDefault = await categoryModel.findAccessibleById(userId, categoryId);
      if (!updatedDefault) {
        throw new ApiError(404, 'Category was not found');
      }
      return updatedDefault;
    }

    requireName(nextName);
    requireTargetBudget(nextBudget);

    if (await categoryModel.nameTaken(userId, nextName, categoryId)) {
      throw new ApiError(409, 'You already have a category with this name');
    }

    try {
      const updated = await categoryModel.updateOwned(userId, categoryId, nextName, nextBudget);
      if (!updated) {
        throw new ApiError(404, 'Category was not found');
      }
      return updated;
    } catch (error) {
      toConflictError(error);
      throw error;
    }
  },

  deleteCategory: async (userId: number, categoryId: number) => {
    requireUserId(userId);
    if (!isPositiveInteger(categoryId)) {
      throw new ApiError(400, 'A valid category id is required');
    }

    const existing = await categoryModel.findAccessibleById(userId, categoryId);
    if (!existing) {
      throw new ApiError(404, 'Category was not found');
    }

    if (existing.userId === null) {
      throw new ApiError(403, 'Default categories cannot be deleted');
    }

    const deleted = await categoryModel.deleteOwned(userId, categoryId);
    if (!deleted) {
      throw new ApiError(404, 'Category was not found');
    }
  },
};
