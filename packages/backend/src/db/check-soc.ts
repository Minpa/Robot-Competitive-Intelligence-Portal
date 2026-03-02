import { db, components } from './index.js';
import { eq } from 'drizzle-orm';

async function check() {
  const socs = await db.select().from(components).where(eq(components.type, 'soc')).limit(5);
  for (const s of socs) {
    console.log(s.name, '→ specifications:', JSON.stringify(s.specifications));
  }
  process.exit(0);
}
check();
