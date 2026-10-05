import app from './app';
import { initializeDatabase } from './config/db';
import { assertDatabaseConfig, env } from './config/env';

const PORT = env.PORT || 5000;

const startServer = async () => {
  assertDatabaseConfig();
  await initializeDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error: unknown) => {
  console.error('Failed to connect to the database', error);
  process.exitCode = 1;
});