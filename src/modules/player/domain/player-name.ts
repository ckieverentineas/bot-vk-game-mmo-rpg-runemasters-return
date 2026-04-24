export const playerNameMaxLength = 24;

const allowedNameCharactersPattern = /[^\p{L}\p{N}_#\- ]/gu;
const whitespacePattern = /\s+/gu;

export const formatDefaultPlayerName = (vkId: number): string => `Рунный мастер #${vkId}`;

const normalizePlayerNameText = (value: string): string => (
  Array.from(
    value
      .replace(allowedNameCharactersPattern, '')
      .replace(whitespacePattern, ' ')
      .trim(),
  )
    .slice(0, playerNameMaxLength)
    .join('')
    .trim()
);

export const normalizeRequestedPlayerName = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizePlayerNameText(value);
  return normalized.length > 0 ? normalized : null;
};

export const resolvePlayerDisplayName = (
  value: string | null | undefined,
  vkId: number,
): string => normalizeRequestedPlayerName(value) ?? formatDefaultPlayerName(vkId);
