import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export type CursorToken = {
  createdAt: string;
  id: string;
};

export const encodeCursor = (row: {
  createdAt: Date | string;
  id: string;
}): string => {
  const createdAt = new Date(row.createdAt).toISOString();
  return Buffer.from(JSON.stringify({ createdAt, id: row.id })).toString(
    'base64url',
  );
};

export const decodeCursor = (cursor?: string | null): CursorToken | null => {
  const value = typeof cursor === 'string' ? cursor.trim() : '';
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.createdAt === 'string' &&
      parsed.createdAt &&
      typeof parsed.id === 'string' &&
      parsed.id
    ) {
      return {
        createdAt: parsed.createdAt,
        id: parsed.id,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export const applyDescendingCursor = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  cursor: CursorToken | null,
  column = 'createdAt',
) => {
  if (!cursor) {
    return qb;
  }

  return qb.andWhere(
    new Brackets((subQuery) => {
      subQuery
        .where(`${alias}.${column} < :cursorCreatedAt`, {
          cursorCreatedAt: cursor.createdAt,
        })
        .orWhere(
          `(${alias}.${column} = :cursorCreatedAt AND ${alias}.id < :cursorId)`,
          {
            cursorCreatedAt: cursor.createdAt,
            cursorId: cursor.id,
          },
        );
    }),
  );
};
