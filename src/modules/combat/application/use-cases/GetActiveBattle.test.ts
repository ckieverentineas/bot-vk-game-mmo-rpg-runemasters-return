import { describe, expect, it, vi } from 'vitest';

import type { BattleView, PlayerState } from '../../../../../shared/types/game';
import type { GameRandom } from '../../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { GetActiveBattle } from './GetActiveBattle';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 3, intelligence: 1 },
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: 'battle-1',
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 1,
  tutorialState: 'SKIPPED',
  inventory: {
    usualShards: 0,
    unusualShards: 0,
    rareShards: 0,
    epicShards: 0,
    legendaryShards: 0,
    mythicalShards: 0,
    leather: 0,
    bone: 0,
    herb: 0,
    essence: 0,
    metal: 0,
    crystal: 0,
  },
  runes: [],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 1,
  biomeCode: 'initium',
  enemyCode: 'training-wisp',
  turnOwner: 'PLAYER',
  player: {
    playerId: 1,
    name: 'Рунный мастер #1001',
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 3,
    intelligence: 1,
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 4,
    currentMana: 4,
    runeLoadout: null,
    guardPoints: 0,
  },
  enemy: {
    code: 'training-wisp',
    name: 'Учебный огонёк',
    kind: 'spirit',
    isElite: false,
    isBoss: false,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 6,
    currentHealth: 6,
    maxMana: 4,
    currentMana: 4,
    experienceReward: 6,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'касается искрой',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['🗺️ Порог Инициации: на вас выходит обычный враг Учебный огонёк.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createRandom = (): GameRandom => ({
  nextInt: vi.fn().mockReturnValue(1),
  rollPercentage: vi.fn().mockReturnValue(false),
  pickOne: vi.fn((items: readonly string[]) => items[0]),
});

describe('GetActiveBattle', () => {
  it('auto-resolves a stuck enemy turn and returns the canonical active battle', async () => {
    const activeBattle = createBattle({ turnOwner: 'ENEMY' });
    const recoveredBattle = createBattle({
      turnOwner: 'PLAYER',
      player: {
        ...activeBattle.player,
        currentHealth: 7,
      },
      log: [...activeBattle.log, '👾 Учебный огонёк касается искрой и наносит 1 урона.'],
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      saveBattle: vi.fn().mockResolvedValue(recoveredBattle),
    } as unknown as GameRepository;
    const useCase = new GetActiveBattle(repository, createRandom());

    await expect(useCase.execute(1001)).resolves.toEqual(recoveredBattle);

    expect(repository.saveBattle).toHaveBeenCalled();
  });

  it('throws when there is no active battle', async () => {
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer({ activeBattleId: null })),
      getActiveBattle: vi.fn().mockResolvedValue(null),
    } as unknown as GameRepository;
    const useCase = new GetActiveBattle(repository, createRandom());

    await expect(useCase.execute(1001)).rejects.toMatchObject({ code: 'battle_not_found' });
  });
});
