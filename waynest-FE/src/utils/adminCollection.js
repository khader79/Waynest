




const isRecord = (value) =>
typeof value === "object" && value !== null;

export const extractAdminCollection = (
payload) =>
{
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length
    };
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return {
      items: payload.data,
      total:
      typeof payload.total === "number" ?
      payload.total :
      payload.data.length
    };
  }

  return {
    items: [],
    total: 0
  };
};