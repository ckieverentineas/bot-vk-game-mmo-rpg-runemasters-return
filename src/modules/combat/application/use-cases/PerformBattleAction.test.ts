import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../../../shared/domain/AppError';
import type { BattleView, PlayerState } from '../../../../../shared/types/game';
import type { GameRandom } from '../../../../shared/application/ports/GameRandom';
import type { GameRepository } from '../../../../shared/application/ports/GameRepository';
import { buildBattleActionIntentStateKey } from '../command-intent-state';
import { PerformBattleAction } from './PerformBattleAction';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: { health: 8, attack: 4, defence: 3, magicDefence: 1, dexterity: 2, intelligence: 1 },
  allocationPoints: { health: 0, attack: 0, defence: 0, magicDefence: 0, dexterity: 0, intelligence: 0 },
  unspentStatPoints: 0,
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
    usualShards: 0, unusualShards: 0, rareShards: 0, epicShards: 0, legendaryShards: 0, mythicalShards: 0,
    leather: 0, bone: 0, herb: 0, essence: 0, metal: 0, crystal: 0,
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
  enemyCode: 'slime',
  turnOwner: 'PLAYER',
  player: {
    playerId: 1,
    name: 'Рунный мастер #1001',
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 4,
    currentMana: 4,
    runeLoadout: null,
    guardPoints: 0,
  },
  enemy: {
    code: 'slime',
    name: 'Слизень',
    kind: 'enemy',
    isElite: false,
    isBoss: false,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 0,
    maxHealth: 5,
    currentHealth: 5,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 4,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'бьёт',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['⚔️ Бой начался.'],
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

describe('PerformBattleAction', () => {
  it('returns the canonical replay result before reading active battle state', async () => {
    const replayedBattle = createBattle({ status: 'COMPLETED', result: 'VICTORY', rewards: { experience: 4, gold: 2, shards: { USUAL: 1 }, droppedRune: null } });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayedBattle }),
      getActiveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(1001, 'ATTACK', 'intent-battle-1', 'state-battle-1', 'payload')).resolves.toEqual(replayedBattle);

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
  });

  it('rejects a replay receipt when the payload state key no longer matches the stored battle rail', async () => {
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      getCommandIntentResult: vi.fn().mockRejectedValue(new AppError('stale_command_intent', 'Эта кнопка уже устарела. Обновите экран перед повтором команды.')),
      getActiveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(1001, 'ATTACK', 'intent-battle-stale', 'state-battle-new', 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
  });

  it('passes guarded battle options to saveBattle for payload actions', async () => {
    const player = createPlayer();
    const activeBattle = createBattle({
      enemy: {
        ...createBattle().enemy,
        maxHealth: 20,
        currentHealth: 20,
      },
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      finalizeBattle: vi.fn(),
      saveBattle: vi.fn().mockResolvedValue(createBattle({ turnOwner: 'ENEMY', actionRevision: 1 })),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());
    const stateKey = buildBattleActionIntentStateKey(activeBattle, 'ATTACK');

    await useCase.execute(player.vkId, 'ATTACK', 'intent-battle-2', stateKey, 'payload');

    expect(repository.saveBattle).toHaveBeenCalledWith(
      expect.objectContaining({ id: activeBattle.id }),
      expect.objectContaining({
        commandKey: 'BATTLE_ATTACK',
        intentId: 'intent-battle-2',
        intentStateKey: stateKey,
        currentStateKey: stateKey,
      }),
    );
    expect(repository.finalizeBattle).not.toHaveBeenCalled();
  });

  it('rejects malformed payload battle commands before mutation', async () => {
    const player = createPlayer();
    const activeBattle = createBattle();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      saveBattle: vi.fn(),
      finalizeBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(player.vkId, 'ATTACK', undefined, undefined, 'payload')).rejects.toMatchObject({ code: 'stale_command_intent' });

    expect(repository.saveBattle).not.toHaveBeenCalled();
    expect(repository.finalizeBattle).not.toHaveBeenCalled();
  });
});
