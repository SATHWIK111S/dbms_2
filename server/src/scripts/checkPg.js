const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function check() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'disaster_relief'
  });

  try {
    await client.connect();
    console.log('[PostgreSQL] Connected to', process.env.PGDATABASE, 'on port', process.env.PGPORT);

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log('[Tables in PostgreSQL]:', tables.rows.map(r => r.table_name));

    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('[Views in PostgreSQL]:', views.rows.map(r => r.table_name));

    const triggers = await client.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public';
    `);
    console.log('[Triggers in PostgreSQL]:', triggers.rows);

    if (tables.rows.length === 0) {
      console.log('[Notice] Database is empty. Schema not yet loaded into PostgreSQL.');
    } else {
      const incCount = await client.query('SELECT COUNT(*) FROM public.incidents');
      console.log('[Incidents row count]:', incCount.rows[0].count);
    }

    await client.end();
  } catch (err) {
    console.error('[PostgreSQL Error]:', err.message);
  }
}

check();
