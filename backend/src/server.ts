import { createApp } from './app.js';
import { config } from './config.js';
import { db, initDatabase } from './db/index.js';
import { seedDatabase } from './db/seed.js';

async function startServer() {
  try {
    console.log('[NSS-VOTING] Initializing ACID Database Schema...');
    initDatabase();
    console.log('[NSS-VOTING] Database ready.');

    // Auto-seed if database is fresh / deployed on Render
    try {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      if (userCount.count === 0) {
        console.log('[NSS-VOTING] Fresh database detected. Auto-seeding initial accounts & elections...');
        await seedDatabase();
      }
    } catch (seedErr) {
      console.warn('[NSS-VOTING] Auto-seed check notice:', seedErr);
    }

    const app = createApp();

    app.listen(config.PORT, () => {
      console.log(`====================================================`);
      console.log(`  NSS BIOMETRIC DIGITAL VOTING SYSTEM - BACKEND API`);
      console.log(`  Listening on http://localhost:${config.PORT}`);
      console.log(`  WebAuthn RP ID: ${config.RP_ID}`);
      console.log(`  Allowed Origin: ${config.RP_ORIGIN}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Fatal Server Boot Error:', error);
    process.exit(1);
  }
}

startServer();

