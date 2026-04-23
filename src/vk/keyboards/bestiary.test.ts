import { describe, expect, it } from 'vitest';

import type { BestiaryView } from '../../modules/world/application/read-models/bestiary';
import { createBestiaryKeyboard } from './bestiary';

interface SerializedButtonPayload {
  readonly command: string;
}

interface SerializedButton {
  readonly action: {
    readonly label: string;
    readonly payload: string;
  };
}

interface SerializedKeyboard {
  readonly rows: Array<Array<SerializedButton>>;
  readonly currentRow?: Array<SerializedButton>;
}

const collectPayloads = (keyboard: ReturnType<typeof createBestiaryKeyboard>): SerializedButtonPayload[] => {
  const serialized = JSON.parse(JSON.stringify(keyboard)) as SerializedKeyboard;

  return [...serialized.rows.flat(), ...(serialized.currentRow ?? [])]
    .map((button) => JSON.parse(button.action.payload) as SerializedButtonPayload);
};

const createBestiary = (overrides: Partial<BestiaryView> = {}): BestiaryView => ({
  pageNumber: 2,
  totalPages: 3,
  totalLocations: 12,
  locations: [],
  ...overrides,
});

describe('createBestiaryKeyboard', () => {
  it('encodes carousel page numbers in keyboard commands', () => {
    const payloads = collectPayloads(createBestiaryKeyboard(createBestiary()));

    expect(payloads.map(({ command }) => command)).toEqual([
      'бестиарий страница 1',
      'бестиарий страница 3',
      'назад',
    ]);
  });

  it('keeps a compact keyboard when there is only one page', () => {
    const payloads = collectPayloads(createBestiaryKeyboard(createBestiary({
      pageNumber: 1,
      totalPages: 1,
      totalLocations: 5,
    })));

    expect(payloads.map(({ command }) => command)).toEqual(['назад']);
  });
});
