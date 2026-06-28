const { readFileSync } = require('fs');
const { Client } = require('pg');
const { join } = require('path');

async function run() {
  const sql = readFileSync(join(__dirname, 'war-room-update-2026-06-28.sql'), 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 30000,
    query_timeout: 30000,
  });
  await client.connect();
  console.log('Connected to database');
  try {
    await client.query(sql);
    console.log('war-room-update-2026-06-28.sql executed successfully');
  } catch (err) {
    console.error('Error executing SQL:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
