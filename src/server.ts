import app from './app';
import { initializeDatabase } from './config/db';
import { env } from './config/env';

const PORT = env.PORT || 5000;

const startServer = async () => {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error: unknown) => {
  console.error('Failed to connect to the database', error);
  process.exitCode = 1;
});