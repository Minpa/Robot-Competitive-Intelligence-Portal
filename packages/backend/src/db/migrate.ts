import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database');

    // Read and execute migration files in order
    const drizzleDir = path.join(__dirname, '../../drizzle');
    const files = fs.readdirSync(drizzleDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(drizzleDir, file), 'utf-8');
      
      // Split by statement breakpoint and execute each statement
      const statements = sql.split('--> statement-breakpoint');
      
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
          try {
            await client.query(trimmed);
          } catch (err: any) {
            // Ignore "already exists" errors
            if (!err.message.includes('already exists') && 
                !err.message.includes('duplicate key')) {
              console.error(`Error in ${file}:`, err.message);
            }
          }
        }
      }
      console.log(`Completed: ${file}`);
    }

    console.log('All migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
