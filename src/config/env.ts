import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'src/config/.env') });

const port = Number.parseInt(process.env.PORT ?? '5000', 10);
const databasePort = Number.parseInt(process.env.DB_PORT ?? '5432', 10);

export const env = {
  PORT: Number.isNaN(port) ? 5000 : port,
  DB_HOST: process.env.DB_HOST ?? '',
  DB_PORT: Number.isNaN(databasePort) ? 5432 : databasePort,
  DB_NAME: process.env.DB_NAME ?? '',
  DB_USER: process.env.DB_USER ?? '',
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',
};