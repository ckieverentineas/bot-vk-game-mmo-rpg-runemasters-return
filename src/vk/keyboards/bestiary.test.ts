import { describe, expect, it } from 'vitest';

import type {
  BestiaryLocationDetailView,
  BestiaryLocationSummaryView,
  BestiaryOverviewView,
} from '../../modules/world/application/read-models/bestiary';
import {
  createBestiaryLocationCommand,
  createBestiaryPageCommand,
  gameCommands,
} from '../commands/catalog';
import {
  createBestiaryKeyboard,
  createBestiaryLocationKeyboard,
} from './bestiary';

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

type BestiaryKeyboard = ReturnType<typeof createBestiaryKeyboard> | ReturnType<typeof createBestiaryLocationKeyboard>;

const collectPayloads = (keyboard: BestiaryKeyboard): SerializedButtonPayload[] => {
  const serialized = JSON.parse(JSON.stringify(keyboard)) as SerializedKeyboard;

  return [...serialized.rows.flat(), ...(serialized.currentRow ?? [])]
    .map((button) => JSON.parse(button.action.payload) as SerializedButtonPayload);
};

const createLocation = (
  code: string,
  isUnlocked = true,
): BestiaryLocationSummaryView => ({
  biome: {
    id: 1,
    code,
    name: code,
    description: '',
    minLevel: 0,
    maxLevel: 0,
  },
  isUnlocked,
  unlockLocationLevel: 0,
  discoveryReward: {
    reward: { radiance: 1 },
    isClaimed: isUnlocked,
    claimedNow: false,
  },
  discoveredEnemyCount: 0,
  revealedDropCount: 0,
  totalEnemyCount: 1,
});

const createBestiary = (overrides: Partial<BestiaryOverviewView> = {}): BestiaryOverviewView => ({
  pageNumber: 2,
  totalPages: 3,
  totalLocations: 12,
  locations: [
    createLocation('initium'),
    createLocation('dark-forest'),
    createLocation('forgotten-caves', false),
  ],
  ...overrides,
});

describe('createBestiaryKeyboard', () => {
  it('adds unlocked location buttons before carousel navigation', () => {
    const payloads = collectPayloads(createBestiaryKeyboard(createBestiary()));

    expect(payloads.map(({ command }) => command)).toEqual([
      createBestiaryLocationCommand('initium'),
      createBestiaryLocationCommand('dark-forest'),
      createBestiaryPageCommand(1),
      createBestiaryPageCommand(3),
      gameCommands.backToMenu,
    ]);
  });

  it('keeps a compact keyboard when there is only one page', () => {
    const payloads = collectPayloads(createBestiaryKeyboard(createBestiary({
      pageNumber: 1,
      totalPages: 1,
      totalLocations: 5,
      locations: [createLocation('initium')],
    })));

    expect(payloads.map(({ command }) => command)).toEqual([
      createBestiaryLocationCommand('initium'),
      gameCommands.backToMenu,
    ]);
  });
});

describe('createBestiaryLocationKeyboard', () => {
  it('returns from location detail to the current overview page', () => {
    const detail: BestiaryLocationDetailView = {
      location: createLocation('initium'),
      enemies: [],
    };
    const payloads = collectPayloads(createBestiaryLocationKeyboard(detail, 2));

    expect(payloads.map(({ command }) => command)).toEqual([
      createBestiaryPageCommand(2),
      gameCommands.backToMenu,
    ]);
  });
});
