import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/**
 * Creates the first admin account from ADMIN_PHONE / ADMIN_PASSWORD, so the
 * owner can log in without anyone running SQL by hand. Further admins are then
 * added from the admin panel.
 *
 * Deliberately conservative, since this runs on every deploy:
 * - an existing admin's password is only reset when ADMIN_RESET_PASSWORD=true
 *   (the way back in after a forgotten password), and
 * - a phone number that already belongs to a candidate or client is never
 *   promoted to admin.
 */
export async function bootstrapAdmin(db: NodePgDatabase<typeof schema>) {
  const phone = process.env.ADMIN_PHONE?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!phone || !password) return;

  if (!/^\+?[0-9]{7,15}$/.test(phone)) {
    console.warn('ADMIN_PHONE is not a valid phone number; admin not created.');
    return;
  }
  if (password.length < 8 || password.length > 72) {
    console.warn('ADMIN_PASSWORD must be 8-72 characters; admin not created.');
    return;
  }

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.phone, phone),
  });
  if (!existing) {
    await db.insert(schema.users).values({
      phone,
      email: process.env.ADMIN_EMAIL?.trim().toLowerCase() || undefined,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin',
    });
    console.log(`Admin account created for ${phone}.`);
    return;
  }
  if (existing.role !== 'admin') {
    console.warn(
      `ADMIN_PHONE ${phone} belongs to a ${existing.role} account; not promoting it to admin.`,
    );
    return;
  }
  if (process.env.ADMIN_RESET_PASSWORD === 'true') {
    await db
      .update(schema.users)
      .set({
        passwordHash: await bcrypt.hash(password, 10),
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existing.id));
    console.log(`Admin password reset for ${phone}.`);
  }
}
