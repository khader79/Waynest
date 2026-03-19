type CollectionResponse<TRecord> = {
  items: TRecord[];
  total: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const extractAdminCollection = <TRecord,>(
  payload: unknown,
): CollectionResponse<TRecord> => {
  if (Array.isArray(payload)) {
    return {
      items: payload as TRecord[],
      total: payload.length,
    };
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return {
      items: payload.data as TRecord[],
      total:
        typeof payload.total === "number"
          ? payload.total
          : payload.data.length,
    };
  }

  return {
    items: [],
    total: 0,
  };
};
