export const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const stringifyJson = (value: unknown, fallback = 'null'): string => {
  const serialized = JSON.stringify(value);
  return serialized ?? fallback;
};

export const cloneJsonValue = <T>(value: T): T => parseJson<T>(stringifyJson(value), value);
