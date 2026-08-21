import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/database/schema';

const CATEGORY_SEED: { name: string; group: (typeof schema.categoryGroup.enumValues)[number]; description: string }[] = [
  { name: 'General Labourer', group: 'physical_labour', description: 'General manual work, no specific trade' },
  { name: 'Loader / Unloader', group: 'physical_labour', description: 'Loading and unloading goods' },
  { name: 'Construction Helper', group: 'physical_labour', description: 'Assists skilled tradespeople on site' },
  { name: 'Cleaner / Housekeeping', group: 'physical_labour', description: 'Cleaning and housekeeping staff' },
  { name: 'Security Guard', group: 'physical_labour', description: 'Site and premises security' },
  { name: 'Gardener / Landscaper', group: 'physical_labour', description: 'Gardening and landscaping work' },

  { name: 'Car Driver', group: 'driver', description: 'Light motor vehicle driver' },
  { name: 'Truck Driver', group: 'driver', description: 'Heavy goods vehicle driver' },
  { name: 'Heavy Vehicle Driver', group: 'driver', description: 'Construction/heavy equipment vehicle operator' },
  { name: 'Two-Wheeler Delivery Rider', group: 'driver', description: 'Bike/scooter delivery rider' },

  { name: 'Electrician', group: 'artisan', description: 'Electrical wiring and repair' },
  { name: 'Plumber', group: 'artisan', description: 'Plumbing installation and repair' },
  { name: 'Carpenter', group: 'artisan', description: 'Woodwork and furniture' },
  { name: 'Mason', group: 'artisan', description: 'Bricklaying and masonry' },
  { name: 'Painter', group: 'artisan', description: 'Wall and surface painting' },
  { name: 'Welder', group: 'artisan', description: 'Metal welding and fabrication' },
  { name: 'AC Technician', group: 'artisan', description: 'Air conditioning install and repair' },
  { name: 'Mechanic', group: 'artisan', description: 'Vehicle and machinery repair' },

  { name: 'Data Entry Operator', group: 'office_staff', description: 'Data entry and clerical work' },
  { name: 'Receptionist', group: 'office_staff', description: 'Front desk and reception' },
  { name: 'Accountant / Bookkeeper', group: 'office_staff', description: 'Accounts and bookkeeping' },
  { name: 'Office Assistant', group: 'office_staff', description: 'General office support' },

  { name: 'Cook / Chef', group: 'other', description: 'Food preparation' },
  { name: 'Event Staff', group: 'other', description: 'Event setup and support staff' },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  for (const category of CATEGORY_SEED) {
    await db.insert(schema.categories).values(category).onConflictDoNothing({ target: schema.categories.name });
  }

  console.log(`Seeded ${CATEGORY_SEED.length} labour categories.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
