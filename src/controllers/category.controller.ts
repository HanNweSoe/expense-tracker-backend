import { RequestHandler } from 'express';
import { categoryService } from '../services/category.service';

const parseTargetBudget = (value: unknown) => {
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return undefined;
};

const parseCategoryId = (value: string | string[] | undefined) =>
  Number(Array.isArray(value) ? value[0] : value);

export const getCategories: RequestHandler = async (request, response, next) => {
  try {
    const categories = await categoryService.listCategories(request.userId ?? NaN);
    response.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory: RequestHandler = async (request, response, next) => {
  try {
    const body = request.body as { name?: unknown; targetBudget?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const targetBudget = parseTargetBudget(body.targetBudget) ?? '';

    const category = await categoryService.createCategory(
      request.userId ?? NaN,
      name,
      targetBudget,
    );

    response.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory: RequestHandler = async (request, response, next) => {
  try {
    const body = request.body as { name?: unknown; targetBudget?: unknown };
    const name = typeof body.name === 'string' ? body.name : undefined;
    const targetBudget = parseTargetBudget(body.targetBudget);

    const category = await categoryService.updateCategory(
      request.userId ?? NaN,
      parseCategoryId(request.params.categoryId),
      name,
      targetBudget,
    );

    response.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory: RequestHandler = async (request, response, next) => {
  try {
    await categoryService.deleteCategory(
      request.userId ?? NaN,
      parseCategoryId(request.params.categoryId),
    );

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};
