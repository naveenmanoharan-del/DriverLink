import { notInArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

type Group = (typeof schema.categoryGroup.enumValues)[number];

/**
 * The roles the platform recruits for: personnel that consultancy firms name in
 * bids for railway and highway contracts (GC, PMC, PGMS, PSSA, Authority /
 * Independent Engineer), from key experts down to site-office support staff.
 *
 * This list is the whole active taxonomy. Anything in the database that is not
 * listed here is deactivated on the next seed — hidden from the forms, but kept
 * so existing profiles that reference it stay intact.
 */
export const CATEGORY_SEED: {
  name: string;
  group: Group;
  description: string;
}[] = [
  {
    name: 'Team Leader / Project Director',
    group: 'key_personnel',
    description: 'Leads the consultancy team on a GC / PMC / AE contract',
  },
  {
    name: 'Resident Engineer / Deputy Team Leader',
    group: 'key_personnel',
    description: 'Heads a site or package on behalf of the team leader',
  },
  {
    name: 'Bridge / Structural Expert',
    group: 'key_personnel',
    description: 'Major and minor bridges, ROBs/RUBs, viaducts, structures',
  },
  {
    name: 'Track / P-Way Expert',
    group: 'key_personnel',
    description: 'Permanent way design, laying, maintenance and track renewal',
  },
  {
    name: 'Highway / Pavement Expert',
    group: 'key_personnel',
    description: 'Highway design, pavement and road safety works',
  },
  {
    name: 'Geotechnical Expert',
    group: 'key_personnel',
    description: 'Soil investigation, foundations, embankments and formation',
  },
  {
    name: 'Signalling & Telecom Expert',
    group: 'key_personnel',
    description: 'S&T design, interlocking, EI and telecom works',
  },
  {
    name: 'OHE / Traction Electrical Expert',
    group: 'key_personnel',
    description: 'Railway electrification, OHE, traction substations',
  },
  {
    name: 'Contract & Procurement Specialist',
    group: 'key_personnel',
    description: 'Tendering, contract administration, claims and variations',
  },
  {
    name: 'Quantity Surveyor / Billing Engineer',
    group: 'key_personnel',
    description: 'Measurement, rate analysis and contractor billing',
  },
  {
    name: 'Quality Assurance / Materials Expert',
    group: 'key_personnel',
    description: 'QA/QC plans, material testing, quality audits',
  },
  {
    name: 'Health & Safety Expert',
    group: 'key_personnel',
    description: 'Site safety management and statutory compliance',
  },
  {
    name: 'Environment & Social Expert',
    group: 'key_personnel',
    description: 'Environmental and social safeguards, R&R',
  },
  {
    name: 'Planning & Scheduling Engineer',
    group: 'key_personnel',
    description: 'Project programmes, Primavera / MS Project, progress reports',
  },

  {
    name: 'Site Engineer (Civil)',
    group: 'technical_staff',
    description: 'Day-to-day supervision of civil works',
  },
  {
    name: 'Section Engineer / Inspector (Works, P-Way, Bridges)',
    group: 'technical_staff',
    description: 'Field inspection and supervision — suits retired SSE/JE',
  },
  {
    name: 'Electrical Engineer',
    group: 'technical_staff',
    description: 'General and traction electrical supervision',
  },
  {
    name: 'S&T Engineer / Inspector',
    group: 'technical_staff',
    description: 'Signalling and telecom field supervision',
  },
  {
    name: 'Survey Engineer / Surveyor',
    group: 'technical_staff',
    description: 'Total station, DGPS and alignment surveys',
  },
  {
    name: 'Lab Technician / Material Inspector',
    group: 'technical_staff',
    description: 'Field and site laboratory testing',
  },
  {
    name: 'CAD Draughtsman',
    group: 'technical_staff',
    description: 'AutoCAD drawings and as-built documentation',
  },

  {
    name: 'Office Manager / Administrator',
    group: 'support_staff',
    description: 'Runs the project or site office',
  },
  {
    name: 'Accountant / Finance Officer',
    group: 'support_staff',
    description: 'Accounts, payroll and invoicing',
  },
  {
    name: 'Document Controller',
    group: 'support_staff',
    description: 'Correspondence, drawings and document registers',
  },
  {
    name: 'HR & Admin Executive',
    group: 'support_staff',
    description: 'Recruitment, attendance and staff administration',
  },
  {
    name: 'Computer Operator / Data Entry',
    group: 'support_staff',
    description: 'Typing, data entry and MIS reports',
  },
  {
    name: 'Stenographer / Secretary',
    group: 'support_staff',
    description: 'Correspondence and executive support',
  },
  {
    name: 'Office Assistant',
    group: 'support_staff',
    description: 'General office support',
  },
];

/** Idempotent: safe to run on every deploy. */
export async function seedCategories(db: NodePgDatabase<typeof schema>) {
  for (const category of CATEGORY_SEED) {
    await db
      .insert(schema.categories)
      .values(category)
      .onConflictDoUpdate({
        target: schema.categories.name,
        set: {
          group: category.group,
          description: category.description,
          isActive: true,
          updatedAt: sql`now()`,
        },
      });
  }
  await db
    .update(schema.categories)
    .set({ isActive: false, updatedAt: sql`now()` })
    .where(
      notInArray(
        schema.categories.name,
        CATEGORY_SEED.map((c) => c.name),
      ),
    );
}
