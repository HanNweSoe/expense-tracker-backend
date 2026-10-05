import { Pool } from 'pg';
import { env } from './env';

export const db = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

export const initializeDatabase = async () => {
  await db.query('BEGIN');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nickname TEXT NOT NULL UNIQUE,
        name TEXT,
        email TEXT UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT');
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
        ) THEN
          ALTER TABLE users ALTER COLUMN name DROP NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
        ) THEN
          ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
        END IF;
      END $$;
    `);

    await db.query(`
      UPDATE users
      SET nickname = COALESCE(
        NULLIF(TRIM(nickname), ''),
        NULLIF(TRIM(name), ''),
        NULLIF(TRIM(SPLIT_PART(email, '@', 1)), ''),
        'user-' || id::TEXT
      )
      WHERE nickname IS NULL OR TRIM(nickname) = ''
    `);

    await db.query(`
      UPDATE users u
      SET nickname = u.nickname || '-' || u.id::TEXT
      WHERE EXISTS (
        SELECT 1
        FROM users other
        WHERE other.id <> u.id
          AND LOWER(other.nickname) = LOWER(u.nickname)
          AND other.id < u.id
      )
    `);

    await db.query('ALTER TABLE users ALTER COLUMN nickname SET NOT NULL');
    await db.query('CREATE UNIQUE INDEX IF NOT EXISTS users_nickname_lower_idx ON users (LOWER(nickname))');

    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
        target_budget NUMERIC(12, 2) CHECK (target_budget IS NULL OR target_budget > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT categories_user_name_unique UNIQUE (user_id, name)
      )
    `);

    await db.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS target_budget NUMERIC(12, 2)
    `);

    await db.query(`
      INSERT INTO categories (user_id, name, type)
      SELECT NULL, default_category.name, 'expense'
      FROM (VALUES
        ('food'),
        ('entertainment'),
        ('transportation'),
        ('shopping'),
        ('bills'),
        ('health')
      ) AS default_category(name)
      WHERE NOT EXISTS (
        SELECT 1
        FROM categories
        WHERE user_id IS NULL
          AND LOWER(name) = default_category.name
          AND type = 'expense'
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        merchant TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        spent_at DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS merchant TEXT');
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'description'
        ) THEN
          UPDATE expenses
          SET merchant = COALESCE(NULLIF(TRIM(merchant), ''), NULLIF(TRIM(description), ''), 'Unknown')
          WHERE merchant IS NULL OR TRIM(merchant) = '';
        ELSE
          UPDATE expenses
          SET merchant = COALESCE(NULLIF(TRIM(merchant), ''), 'Unknown')
          WHERE merchant IS NULL OR TRIM(merchant) = '';
        END IF;
      END $$;
    `);
    await db.query('ALTER TABLE expenses ALTER COLUMN merchant SET NOT NULL');

    await db.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT budgets_dates_valid CHECK (end_date >= start_date)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS category_budget_overrides (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        target_budget NUMERIC(12, 2) NOT NULL CHECK (target_budget > 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, category_id)
      )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses (user_id, spent_at DESC)');
    await db.query('CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses (category_id)');
    await db.query('CREATE INDEX IF NOT EXISTS budgets_user_dates_idx ON budgets (user_id, start_date, end_date)');
    await db.query('CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at)');
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};
