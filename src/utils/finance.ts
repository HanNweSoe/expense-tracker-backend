export const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Dining',
  entertainment: 'Entertainment',
  transportation: 'Transport',
  shopping: 'Shopping',
  bills: 'Bills & Rent',
  health: 'Health & Care',
};

export const DEFAULT_BUDGETS: Record<string, number> = {
  food: 400,
  entertainment: 150,
  transportation: 200,
  shopping: 300,
  bills: 800,
  health: 150,
};

export const toAmount = (value: string | number | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const categoryLabel = (name?: string | null): string => {
  if (!name) {
    return 'Uncategorized';
  }
  return CATEGORY_LABELS[name.toLowerCase()] ?? name;
};

export const categoryBudget = (name: string, targetBudget: string | null): number =>
  toAmount(targetBudget) || DEFAULT_BUDGETS[name.toLowerCase()] || 0;

export const previousMonthKey = (month: string): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (month: string): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const daysLeftInMonth = (month: string, now = new Date()): number => {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (month !== currentMonth) {
    return lastDay;
  }
  return Math.max(lastDay - now.getDate(), 1);
};

export const iconForCategory = (name?: string | null): 'coffee' | 'bag' | 'train' | 'paw' => {
  const category = (name ?? '').toLowerCase();
  if (category.includes('shop')) {
    return 'bag';
  }
  if (category.includes('transport') || category.includes('commute')) {
    return 'train';
  }
  if (category.includes('health') || category.includes('pet')) {
    return 'paw';
  }
  return 'coffee';
};

const toDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }
  return new Date(`${String(value).slice(0, 10)}T00:00:00`);
};

export const formatExpenseTime = (spentAt: Date | string, createdAt?: Date | string): string => {
  const date = toDate(spentAt);
  if (Number.isNaN(date.getTime())) {
    return String(spentAt);
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    const created = createdAt ? new Date(createdAt) : date;
    return created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
