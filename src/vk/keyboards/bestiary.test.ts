import { describe, expect, it } from 'vitest';

import type {
  BestiaryEnemyDetailView,
  BestiaryEnemyView,
  BestiaryLocationDetailView,
  BestiaryLocationSummaryView,
  BestiaryOverviewView,
} from '../../modules/world/application/read-models/bestiary';
import {
  createBestiaryEnemyCommand,
  createBestiaryEnemyRewardCommand,
  createBestiaryLocationCommand,
  createBestiaryLocationRewardCommand,
  createBestiaryPageCommand,
  gameCommands,
} from '../commands/catalog';
import {
  createBestiaryEnemyKeyboard,
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

type BestiaryKeyboard =
  | ReturnType<typeof createBestiaryKeyboard>
  | ReturnType<typeof createBestiaryLocationKeyboard>
  | ReturnType<typeof createBestiaryEnemyKeyboard>;

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

const createEnemy = (overrides: Partial<BestiaryEnemyView> = {}): BestiaryEnemyView => ({
  template: {
    code: 'training-wisp',
    biomeCode: 'initium',
    name: 'Учебный огонек',
    kind: 'spirit',
    isElite: false,
    isBoss: false,
    baseStats: {
      health: 8,
      attack: 1,
      defence: 0,
      magicDefence: 0,
      dexterity: 2,
      intelligence: 1,
    },
    scales: {
      health: 1,
      attack: 1,
      defence: 1,
      magicDefence: 1,
      dexterity: 1,
      intelligence: 1,
    },
    baseExperience: 6,
    baseGold: 2,
    runeDropChance: 10,
    lootTable: { essence: 1 },
    attackText: 'касается искрой',
  },
  isDiscovered: true,
  isDropRevealed: true,
  tacticalProfile: null,
  victoryCount: 1,
  killMilestones: [
    { threshold: 1, reward: { radiance: 1 }, isCompleted: true, isClaimed: false, claimedNow: false },
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
  it('adds enemy buttons before navigation', () => {
    const detail: BestiaryLocationDetailView = {
      location: createLocation('initium', true),
      locationPageNumber: 2,
      enemyPageNumber: 1,
      totalEnemyPages: 1,
      totalEnemies: 1,
      enemies: [createEnemy()],
    };
    const payloads = collectPayloads(createBestiaryLocationKeyboard(detail));

    expect(payloads.map(({ command }) => command)).toEqual([
      createBestiaryEnemyCommand('initium', 'training-wisp'),
      createBestiaryPageCommand(2),
      gameCommands.backToMenu,
    ]);
  });

  it('shows explicit collection and enemy page buttons when they are available', () => {
    const detail: BestiaryLocationDetailView = {
      location: createLocation('initium', true),
      locationPageNumber: 1,
      enemyPageNumber: 2,
      totalEnemyPages: 3,
      totalEnemies: 9,
      enemies: [createEnemy()],
    };
    const claimableDetail = {
      ...detail,
      location: {
        ...detail.location,
        discoveryReward: {
          ...detail.location.discoveryReward,
          isClaimed: false,
        },
      },
    };
    const payloads = collectPayloads(createBestiaryLocationKeyboard(claimableDetail));

    expect(payloads.map(({ command }) => command)).toEqual([
      createBestiaryLocationRewardCommand('initium'),
      createBestiaryEnemyCommand('initium', 'training-wisp'),
      createBestiaryLocationCommand('initium', 1),
      createBestiaryLocationCommand('initium', 3),
      createBestiaryPageCommand(1),
      gameCommands.backToMenu,
    ]);
  });
});

describe('createBestiaryEnemyKeyboard', () => {
  it('adds a dynamic enemy reward button only when a milestone is ready', () => {
    const detail: BestiaryEnemyDetailView = {
      location: createLocation('initium'),
      locationPageNumber: 1,
      enemyPageNumber: 1,
      enemyIndex: 0,
      totalEnemies: 1,
      enemy: createEnemy(),
    };
    const payloads = collectPayloads(createBestiaryEnemyKeyboard(detail));

    expect(payloads.map(({ command }) => command)).toEqual([
      createBestiaryEnemyRewardCommand('initium', 'training-wisp'),
      createBestiaryLocationCommand('initium'),
      createBestiaryPageCommand(1),
      gameCommands.backToMenu,
    ]);
  });
});
