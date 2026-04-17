export interface VersionedContract {
  readonly schemaVersion: number;
}

export type JsonRecord = Record<string, unknown>;

export const isJsonRecord = (value: unknown): value is JsonRecord => (
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value)
);

export const hasSchemaVersion = <T extends number>(value: unknown, schemaVersion: T): value is JsonRecord & { schemaVersion: T } => (
  isJsonRecord(value)
  && value.schemaVersion === schemaVersion
);
