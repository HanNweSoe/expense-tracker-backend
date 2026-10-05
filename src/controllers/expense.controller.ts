import { RequestHandler } from 'express';
import { expenseService } from '../services/expense.service';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getExpenses: RequestHandler = async (request, response, next) => {
  try {
    const expenses = await expenseService.listExpenses(request.userId ?? NaN);

    response.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

export const getExpenseReport: RequestHandler = async (request, response, next) => {
  try {
    const month = typeof request.query.month === 'string' ? request.query.month : undefined;
    const report = await expenseService.getMonthlyReport(request.userId ?? NaN, month);

    response.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

export const getDashboard: RequestHandler = async (request, response, next) => {
  try {
    const dashboard = await expenseService.getDashboard(request.userId ?? NaN);

    response.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

export const createExpense: RequestHandler = async (request, response, next) => {
  try {
    const body = request.body as {
      categoryId?: unknown;
      category?: unknown;
      merchant?: unknown;
      amount?: unknown;
      date?: unknown;
      spentAt?: unknown;
      description?: unknown;
    };

    const categoryValue = body.category ?? body.categoryId;
    const categoryId = categoryValue == null
      ? null
      : typeof categoryValue === 'string'
        ? /^\d+$/.test(categoryValue.trim())
          ? Number(categoryValue)
          : categoryValue
        : Number(categoryValue);
    const amount = typeof body.amount === 'number' ? String(body.amount) : body.amount;
    const merchantSource = body.merchant ?? body.description;
    const merchant = merchantSource == null ? '' : String(merchantSource).trim();
    const dateSource = body.date ?? body.spentAt;
    const date = dateSource == null ? new Date().toISOString().slice(0, 10) : String(dateSource);

    const expense = await expenseService.createExpense({
      userId: request.userId ?? NaN,
      categoryId,
      merchant,
      amount: typeof amount === 'string' ? amount : '',
      date,
    });

    response.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

export const scanExpenses: RequestHandler = async (request, res, next) => {
  try {
    const { base64Image, mimeType } = request.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    console.log('Received base64 image for scanning:', !!base64Image.substring(0, 30) + '...');

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType || 'image/jpeg',
          },
        },
        {
          text: 'Analyze this receipt image and extract the key receipt information accurately.',
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING, description: 'YYYY-MM-DD format' },
            category: {
              type: Type.STRING,
              description: 'One of: food, entertainment, transportation, or another short category name',
            },
          },
          required: ['merchant', 'category', 'amount', 'date'],
        },
      },
    });

    console.log('Gemini AI response:', response?.text?.substring(0, 200) + '...');

    const extractedData = response?.text ? JSON.parse(response.text) : null;
    console.log('Extracted Data:', extractedData);
    return res.status(200).json({ success: true, data: extractedData });

  } catch (error) {
    next(error);
    console.error('Error scanning receipt:', error);
  }
};
