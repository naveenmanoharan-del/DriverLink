import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { categories, categoryGroup } from '../database/schema';

type CategoryGroup = (typeof categoryGroup.enumValues)[number];

@Injectable()
export class CategoriesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  findAll(group?: string) {
    const isValidGroup = (g?: string): g is CategoryGroup =>
      !!g && (categoryGroup.enumValues as string[]).includes(g);
    const conditions = [eq(categories.isActive, true)];
    if (isValidGroup(group)) conditions.push(eq(categories.group, group));
    return this.db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.group), asc(categories.name));
  }
}
