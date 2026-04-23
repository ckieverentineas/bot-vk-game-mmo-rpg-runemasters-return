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
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(1001, 'ATTACK', 'intent-battle-1', 'state-battle-1', 'payload')).resolves.toEqual({
      battle: replayedBattle,
      player: null,
      acquisitionSummary: null,
      replayed: true,
    });

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
  });

  it('returns canonical replay for a legacy text battle command before reading active battle state', async () => {
    const replayedBattle = createBattle({ status: 'COMPLETED', result: 'VICTORY', rewards: { experience: 4, gold: 2, shards: { USUAL: 1 }, droppedRune: null } });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayedBattle }),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(1001, 'ATTACK', 'legacy-text:2000000001:1001:86:атака', undefined, 'legacy_text')).resolves.toEqual({
      battle: replayedBattle,
      player: null,
      acquisitionSummary: null,
      replayed: true,
    });

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
  });

  it('preserves an already stored impact recap on replay', async () => {
    const replayedBattle = createBattle({ status: 'COMPLETED', result: 'VICTORY', rewards: { experience: 4, gold: 2, shards: { USUAL: 1 }, droppedRune: null } });
    const replayedResult = {
      battle: replayedBattle,
      player: createPlayer(),
      acquisitionSummary: {
        kind: 'new_rune' as const,
        title: 'Новая руна: Руна Пламени',
        changeLine: 'Даёт школе Пламени новый боевой ход.',
        nextStepLine: 'Откройте «🔮 Руны» и примерьте её в сборке.',
      },
    };
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      getCommandIntentResult: vi.fn().mockResolvedValue({ status: 'APPLIED', result: replayedResult }),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(1001, 'ATTACK', 'intent-battle-keep-summary', 'state-battle-keep-summary', 'payload')).resolves.toEqual({
      ...replayedResult,
      replayed: true,
    });

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
  });

  it('rejects legacy text battle commands when server-owned intent metadata is unavailable', async () => {
    const activeBattle = createBattle();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      getCommandIntentResult: vi.fn(),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(1001, 'ATTACK', undefined, undefined, 'legacy_text')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.getActiveBattle).toHaveBeenCalledWith(1);
  });

  it('rejects a replay receipt when the payload state key no longer matches the stored battle rail', async () => {
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(createPlayer()),
      getCommandIntentResult: vi.fn().mockRejectedValue(new AppError('stale_command_intent', 'Этот боевой жест уже выцвел. Вернитесь к свежей развилке боя.')),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(1001, 'ATTACK', 'intent-battle-stale', 'state-battle-new', 'payload')).rejects.toMatchObject({
      code: 'stale_command_intent',
    });

    expect(repository.getActiveBattle).not.toHaveBeenCalled();
  });

  it('rejects party actions before the member turn', async () => {
    const waitingPlayer = createPlayer({ vkId: 1002, playerId: 2 });
    const firstMember = createBattle().player;
    const secondMember = {
      ...createBattle().player,
      playerId: 2,
      name: 'Рунный мастер #1002',
    };
    const activeBattle = createBattle({
      battleType: 'PARTY_PVE',
      party: {
        id: 'party-1',
        inviteCode: 'ABC123',
        leaderPlayerId: 1,
        currentTurnPlayerId: 1,
        enemyTargetPlayerId: null,
        actedPlayerIds: [],
        members: [
          { playerId: 1, vkId: 1001, name: firstMember.name, snapshot: firstMember },
          { playerId: 2, vkId: 1002, name: secondMember.name, snapshot: secondMember },
        ],
      },
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(waitingPlayer),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      saveBattle: vi.fn(),
      finalizeBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());

    await expect(useCase.execute(waitingPlayer.vkId, 'ATTACK')).rejects.toMatchObject({
      code: 'party_member_turn_required',
    });

    expect(repository.saveBattle).not.toHaveBeenCalled();
    expect(repository.finalizeBattle).not.toHaveBeenCalled();
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
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
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
        playerSkillGains: [
          {
            skillCode: 'combat.striking',
            points: 1,
          },
        ],
      }),
    );
    expect(repository.storeCommandIntentResult).toHaveBeenCalledWith(
      player.playerId,
      'intent-battle-2',
      expect.objectContaining({
        battle: expect.objectContaining({ id: activeBattle.id }),
        acquisitionSummary: null,
      }),
    );
    expect(repository.finalizeBattle).not.toHaveBeenCalled();
  });

  it('passes guard skill growth to saveBattle from the defend action facts', async () => {
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
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      finalizeBattle: vi.fn(),
      saveBattle: vi.fn(async (battle: BattleView) => battle),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());
    const stateKey = buildBattleActionIntentStateKey(activeBattle, 'DEFEND');

    await useCase.execute(player.vkId, 'DEFEND', 'intent-defend-growth', stateKey, 'payload');

    expect(repository.saveBattle).toHaveBeenCalledWith(
      expect.objectContaining({ id: activeBattle.id }),
      expect.objectContaining({
        commandKey: 'BATTLE_DEFEND',
        playerSkillGains: [
          {
            skillCode: 'combat.guard',
            points: 1,
          },
        ],
      }),
    );
  });

  it('passes active rune skill growth to saveBattle from rune resource facts', async () => {
    const player = createPlayer();
    const activeBattle = createBattle({
      player: {
        ...createBattle().player,
        currentMana: 6,
        maxMana: 6,
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Р СѓРЅР° РџР»Р°РјРµРЅРё',
          runeRarity: 'USUAL',
          archetypeCode: 'ember',
          archetypeName: 'РџР»Р°РјРµРЅСЊ',
          passiveAbilityCodes: [],
          activeAbility: {
            code: 'ember_pulse',
            name: 'РРјРїСѓР»СЊСЃ РџР»Р°РјРµРЅРё',
            manaCost: 2,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
      },
      enemy: {
        ...createBattle().enemy,
        maxHealth: 20,
        currentHealth: 20,
      },
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      finalizeBattle: vi.fn(),
      saveBattle: vi.fn(async (battle: BattleView) => battle),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());
    const stateKey = buildBattleActionIntentStateKey(activeBattle, 'RUNE_SKILL_SLOT_1');

    await useCase.execute(player.vkId, 'RUNE_SKILL_SLOT_1', 'intent-rune-growth', stateKey, 'payload');

    expect(repository.saveBattle).toHaveBeenCalledWith(
      expect.objectContaining({ id: activeBattle.id }),
      expect.objectContaining({
        commandKey: 'BATTLE_RUNE_SKILL',
        playerSkillGains: [
          {
            skillCode: 'rune.active_use',
            points: 1,
          },
        ],
      }),
    );
  });

  it('passes combat skill growth to finalizeBattle when the action ends the battle', async () => {
    const player = createPlayer();
    const activeBattle = createBattle({
      enemy: {
        ...createBattle().enemy,
        maxHealth: 1,
        currentHealth: 1,
      },
    });
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      finalizeBattle: vi.fn(async (_playerId: number, battle: BattleView) => ({
        player,
        battle,
      })),
      saveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, createRandom());
    const stateKey = buildBattleActionIntentStateKey(activeBattle, 'ATTACK');

    await useCase.execute(player.vkId, 'ATTACK', 'intent-final-strike-growth', stateKey, 'payload');

    expect(repository.finalizeBattle).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({ status: 'COMPLETED', result: 'VICTORY' }),
      expect.objectContaining({
        commandKey: 'BATTLE_ATTACK',
        playerSkillGains: [
          {
            skillCode: 'combat.striking',
            points: 1,
          },
        ],
      }),
    );
    expect(repository.saveBattle).not.toHaveBeenCalled();
  });

  it('finalizes a successful flee as a neutral completed encounter', async () => {
    const player = createPlayer();
    const activeBattle = createBattle({
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'PLAYER',
        canFlee: true,
        fleeChancePercent: 52,
      },
    });
    const random = createRandom();
    vi.mocked(random.rollPercentage).mockReturnValue(true);
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      finalizeBattle: vi.fn(async (_playerId: number, battle: BattleView) => ({
        player,
        battle,
      })),
      saveBattle: vi.fn(),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, random);
    const stateKey = buildBattleActionIntentStateKey(activeBattle, 'FLEE');

    const result = await useCase.execute(player.vkId, 'FLEE', 'intent-flee-1', stateKey, 'payload');

    expect(random.rollPercentage).toHaveBeenCalledWith(52);
    expect(result.battle.result).toBe('FLED');
    expect(result.battle.rewards).toBeNull();
    expect(result.battle.encounter?.status).toBe('FLED');
    expect(repository.finalizeBattle).toHaveBeenCalledWith(
      player.playerId,
      expect.objectContaining({ result: 'FLED' }),
      expect.objectContaining({ commandKey: 'BATTLE_FLEE' }),
    );
    expect(repository.saveBattle).not.toHaveBeenCalled();
  });

  it('saves a failed flee after the enemy immediately answers the opening', async () => {
    const player = createPlayer();
    const activeBattle = createBattle({
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'PLAYER',
        canFlee: true,
        fleeChancePercent: 52,
      },
    });
    const random = createRandom();
    vi.mocked(random.rollPercentage).mockReturnValue(false);
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
      getActiveBattle: vi.fn().mockResolvedValue(activeBattle),
      finalizeBattle: vi.fn(),
      saveBattle: vi.fn(async (battle: BattleView) => battle),
    } as unknown as GameRepository;
    const useCase = new PerformBattleAction(repository, random);
    const stateKey = buildBattleActionIntentStateKey(activeBattle, 'FLEE');

    const result = await useCase.execute(player.vkId, 'FLEE', 'intent-flee-2', stateKey, 'payload');

    expect(random.rollPercentage).toHaveBeenCalledWith(52);
    expect(result.battle.status).toBe('ACTIVE');
    expect(result.battle.result).toBeNull();
    expect(result.battle.encounter?.status).toBe('ENGAGED');
    expect(result.battle.turnOwner).toBe('PLAYER');
    expect(result.battle.player.currentHealth).toBeLessThan(activeBattle.player.currentHealth);
    expect(repository.saveBattle).toHaveBeenCalledWith(
      expect.objectContaining({ encounter: expect.objectContaining({ status: 'ENGAGED' }) }),
      expect.objectContaining({ commandKey: 'BATTLE_FLEE' }),
    );
    expect(repository.finalizeBattle).not.toHaveBeenCalled();
  });

  it('rejects malformed payload battle commands before mutation', async () => {
    const player = createPlayer();
    const activeBattle = createBattle();
    const repository = {
      findPlayerByVkId: vi.fn().mockResolvedValue(player),
      getCommandIntentResult: vi.fn().mockResolvedValue(null),
      storeCommandIntentResult: vi.fn().mockResolvedValue(undefined),
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
