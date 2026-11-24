const app = require('./app');
const config = require('./config');
const db = require('./db');

async function startServer() {
  try {
    console.log('--- Initializing Community Disaster Relief System ---');
    await db.initDb();

    app.listen(config.port, () => {
      console.log(`[Server] Disaster Relief REST API listening on port ${config.port}`);
      console.log(`[Server] Active Database Mode: ${db.getMode()}`);
      console.log(`[Server] API Endpoints ready at http://localhost:${config.port}/api/v1`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
