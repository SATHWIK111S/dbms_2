const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config');

let pool = null;
let pgliteInstance = null;
let activeMode = 'initializing'; // 'postgres' or 'pglite'

// Path to SQL definition files
const DATABASE_DIR = path.resolve(__dirname, '../../../database');

async function readSqlFile(filename) {
  const filePath = path.join(DATABASE_DIR, filename);
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Initializes the database connection.
 * Attempts native PostgreSQL pool first; falls back to embedded PGlite WASM
 * if PostgreSQL server is not running or config specifies auto/embedded.
 */
async function initDb() {
  if (config.useEmbeddedPostgres === 'false') {
    // Force external PostgreSQL
    pool = new Pool(config.pg);
    await pool.query('SELECT 1');
    activeMode = 'postgres';
    console.log(`[DB] Connected to PostgreSQL at ${config.pg.host}:${config.pg.port}/${config.pg.database}`);
    return;
  }

  // Attempt external Postgres if 'auto'
  if (config.useEmbeddedPostgres === 'auto') {
    try {
      const testPool = new Pool(config.pg);
      await testPool.query('SELECT 1');
      pool = testPool;
      activeMode = 'postgres';
      console.log(`[DB] Successfully connected to live PostgreSQL at ${config.pg.host}:${config.pg.port}/${config.pg.database}`);
      return;
    } catch (err) {
      console.log(`[DB] Live PostgreSQL not reachable (${err.message}). Activating embedded PostgreSQL engine (PGlite WASM)...`);
    }
  }

  // Fallback to embedded PGlite WASM (full Postgres 16 engine compiled to WebAssembly)
  try {
    const { PGlite } = require('@electric-sql/pglite');
    // Store in a persistent local data directory inside server/.pgdata
    const dataDir = path.resolve(__dirname, '../../.pgdata');
    pgliteInstance = new PGlite(dataDir);
    activeMode = 'pglite';
    console.log(`[DB] Embedded PostgreSQL engine (PGlite WASM) initialized at ${dataDir}`);

    // Auto-bootstrap schema, triggers, views, and seeds if fresh
    await bootstrapDatabase();
  } catch (err) {
    console.error('[DB] Failed to initialize embedded PostgreSQL engine:', err);
    throw err;
  }
}

/**
 * Executes schema, triggers, views, and seed datasets into the database.
 */
async function bootstrapDatabase() {
  console.log('[DB] Bootstrapping schema, triggers, views, and initial seed dataset...');
  const schemaSql = await readSqlFile('schema.sql');
  const triggersSql = await readSqlFile('triggers.sql');
  const viewsSql = await readSqlFile('views.sql');
  const seedsSql = await readSqlFile('seeds.sql');

  await executeRaw(schemaSql);
  await executeRaw(triggersSql);
  await executeRaw(viewsSql);
  await executeRaw(seedsSql);
  console.log('[DB] Bootstrap completed successfully.');
}

async function executeRaw(sqlScript) {
  if (activeMode === 'postgres') {
    await pool.query(sqlScript);
  } else if (activeMode === 'pglite') {
    await pgliteInstance.exec(sqlScript);
  } else {
    throw new Error('Database not initialized');
  }
}

/**
 * Standard query method
 */
async function query(text, params = []) {
  if (activeMode === 'postgres') {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    return { rows: res.rows, rowCount: res.rowCount, duration };
  } else if (activeMode === 'pglite') {
    const start = Date.now();
    const res = await pgliteInstance.query(text, params);
    const duration = Date.now() - start;
    return { rows: res.rows, rowCount: res.rows ? res.rows.length : 0, duration };
  } else {
    throw new Error('Database not initialized');
  }
}

/**
 * Transaction Client for ACID operations (e.g. Transactional Dispatch Deductions)
 */
async function getTransactionClient() {
  if (activeMode === 'postgres') {
    const client = await pool.connect();
    return {
      query: (text, params) => client.query(text, params),
      release: () => client.release()
    };
  } else if (activeMode === 'pglite') {
    // PGlite supports transaction via pgliteInstance.transaction() or manual BEGIN/COMMIT
    let released = false;
    return {
      query: async (text, params) => {
        if (released) throw new Error('Transaction client already released');
        return pgliteInstance.query(text, params);
      },
      release: () => {
        released = true;
      }
    };
  } else {
    throw new Error('Database not initialized');
  }
}

function getMode() {
  return activeMode;
}

module.exports = {
  initDb,
  query,
  getTransactionClient,
  bootstrapDatabase,
  getMode
};
