import { buildApp } from './app';
import { initDb } from './db/index';
import { env } from './config/env';

async function main() {
  initDb();

  const app = await buildApp();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Server running on port ${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
