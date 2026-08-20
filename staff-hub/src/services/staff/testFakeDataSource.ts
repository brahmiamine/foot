/** Fake in-memory TypeORM-like data source shared by staff governance unit tests. */

export interface FakeRepository<T extends { id: unknown }> {
  find(options?: { where?: Record<string, unknown> }): Promise<T[]>;
  findOne(options: { where: Record<string, unknown> }): Promise<T | null>;
  create(data: Partial<T>): T;
  save(entity: T): Promise<T>;
  remove(entity: T): Promise<T>;
}

function matches(row: Record<string, unknown>, where?: Record<string, unknown>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => value === undefined || row[key] === value);
}

export function createFakeRepository<T extends { id: unknown }>(
  rows: T[],
  nextId: () => T["id"],
): FakeRepository<T> {
  return {
    find: async (options) => rows.filter((row) => matches(row as Record<string, unknown>, options?.where)),
    findOne: async (options) => rows.find((row) => matches(row as Record<string, unknown>, options.where)) ?? null,
    create: (data) => ({ ...data }) as T,
    save: async (entity) => {
      if (entity.id === undefined || entity.id === null) {
        (entity as Record<string, unknown>).id = nextId();
      }
      const index = rows.findIndex((row) => row.id === entity.id);
      if (index >= 0) rows[index] = entity;
      else rows.push(entity);
      return entity;
    },
    remove: async (entity) => {
      const index = rows.findIndex((row) => row.id === entity.id);
      if (index >= 0) rows.splice(index, 1);
      return entity;
    },
  };
}

export function uuidSequence(prefix: string): () => string {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}

export function numericSequence(): () => number {
  let counter = 0;
  return () => ++counter;
}
