export const defaultReleaseEvidenceWindowDays = 7;

interface ResolveReleaseEvidenceWindowOptions {
  readonly since: string | null;
  readonly until: string | null;
  readonly days: number | null;
  readonly now?: Date;
}

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const parseDateArgument = (value: string, argumentName: '--since' | '--until'): Date => {
  const normalizedValue = value.trim();

  if (dateOnlyPattern.test(normalizedValue)) {
    return new Date(`${normalizedValue}${argumentName === '--until' ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`);
  }

  const parsedValue = new Date(normalizedValue);
  if (Number.isNaN(parsedValue.getTime())) {
    throw new Error(`Некорректная дата для ${argumentName}: ${value}`);
  }

  return parsedValue;
};

export const parsePositiveIntegerArgument = (value: string | undefined, argumentName: string): number => {
  if (!value) {
    throw new Error(`Нужно передать значение для ${argumentName}.`);
  }

  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`Некорректное число для ${argumentName}: ${value}`);
  }

  return parsedValue;
};

export const resolveReleaseEvidenceWindow = (
  options: ResolveReleaseEvidenceWindowOptions,
): { since: Date; until: Date } => {
  const resolvedUntil = options.until
    ? parseDateArgument(options.until, '--until')
    : options.now ?? new Date();
  const resolvedSince = options.since
    ? parseDateArgument(options.since, '--since')
    : new Date(resolvedUntil.getTime() - (options.days ?? defaultReleaseEvidenceWindowDays) * 24 * 60 * 60 * 1000);

  if (resolvedSince.getTime() > resolvedUntil.getTime()) {
    throw new Error('Параметр `--since` не может быть позже `--until`.');
  }

  return {
    since: resolvedSince,
    until: resolvedUntil,
  };
};
