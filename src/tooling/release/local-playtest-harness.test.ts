import { describe, expect, it } from 'vitest';

import type { BattleView, PlayerState } from '../../shared/types/game';
import { gameCommands } from '../../vk/commands/catalog';
import {
  buildLocalPlaytestSummary,
  chooseBattleCommand,
  createLocalPlaytestContext,
  listLocalPlaytestFailures,
} from './local-playtest-harness';

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
    name: 'Test player',
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
    name: 'Training Wisp',
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
    attackText: 'touches with a spark',
    intent: null,
    hasUsedSignatureMove: false,
  },
  encounter: null,
  log: [],
  result: null,
  rewards: null,
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
  ...overrides,
});

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 0,
  experience: 6,
  gold: 2,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 3,
    intelligence: 1,
  },
  locationLevel: 1,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 1,
  victoryStreak: 1,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 1,
  highestLocationLevel: 1,
  tutorialState: 'COMPLETED',
  inventory: {
    usualShards: 2,
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
  runes: [
    {
      id: 'rune-1',
      runeCode: 'rune-1',
      archetypeCode: 'ember',
      passiveAbilityCodes: ['ember_heart'],
      activeAbilityCodes: ['ember_pulse'],
      name: 'Unusual ember rune',
      rarity: 'UNUSUAL',
      isEquipped: true,
      equippedSlot: 0,
      health: 1,
      attack: 2,
      defence: 0,
      magicDefence: 0,
      dexterity: 0,
      intelligence: 0,
      createdAt: '2026-04-21T00:00:00.000Z',
    },
  ],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
  ...overrides,
});

const createLog = (action: string, details: Record<string, unknown> = {}) => ({
  action,
  details: JSON.stringify(details),
});

describe('local playtest harness', () => {
  it('creates legacy text contexts with stable message metadata', async () => {
    const context = createLocalPlaytestContext({
      vkId: 1001,
      peerId: 2000000001,
      messageId: 77,
      command: gameCommands.explore,
      payload: null,
    });

    await context.reply('ok', { keyboard: 'keyboard' });

    expect(context.text).toBe(gameCommands.explore);
    expect(context.messagePayload).toBeNull();
    expect(context.conversationMessageId).toBe(77);
    expect(context.replies).toEqual([{ message: 'ok', options: { keyboard: 'keyboard' } }]);
  });

  it('creates payload contexts without leaking command text into legacy routing', () => {
    const context = createLocalPlaytestContext({
      vkId: 1001,
      peerId: 2000000001,
      messageId: 78,
      command: gameCommands.attack,
      payload: {
        command: gameCommands.attack,
        intentId: 'intent-1',
        stateKey: 'state-1',
      },
    });

    expect(context.text).toBe('');
    expect(context.messagePayload).toEqual({
      command: gameCommands.attack,
      intentId: 'intent-1',
      stateKey: 'state-1',
    });
  });

  it('chooses engage command while an encounter is still offered', () => {
    const battle = createBattle({
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'PLAYER',
        canFlee: true,
        fleeChancePercent: 85,
      },
    });

    expect(chooseBattleCommand(battle)).toEqual({
      command: gameCommands.engageBattle,
      action: 'ENGAGE',
    });
  });

  it('chooses the first rune skill when it is ready', () => {
    const battle = createBattle({
      player: {
        ...createBattle().player,
        currentMana: 4,
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Unusual ember rune',
          runeRarity: 'UNUSUAL',
          archetypeCode: 'ember',
          archetypeName: 'Ember',
          schoolCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: {
            code: 'ember_pulse',
            name: 'Ember pulse',
            manaCost: 2,
            cooldownTurns: 1,
            currentCooldown: 0,
          },
        },
      },
    });

    expect(chooseBattleCommand(battle)).toEqual({
      command: gameCommands.skillSlot1,
      action: 'RUNE_SKILL_SLOT_1',
    });
  });

  it('falls back to attack when no better battle command is available', () => {
    expect(chooseBattleCommand(createBattle())).toEqual({
      command: gameCommands.attack,
      action: 'ATTACK',
    });
  });

  it('summarizes logs and suspicious replies', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'legacy-text',
      vkId: 1001,
      player: createPlayer(),
      activeBattle: null,
      transcript: [
        { label: 'start', command: gameCommands.start, payload: null, reply: 'created' },
        { label: 'quest-book', command: gameCommands.questBook, payload: null, reply: '📜 Книга путей\n\nПробуждение Пустого мастера · 🎁 Награда ждёт' },
        { label: 'quest-claim-awakening', command: gameCommands.claimQuestReward, payload: null, reply: '📜 Запись закрыта\n\nВ сумке: +1 обычный осколок.\n\n📜 Книга путей' },
        { label: 'quest-claim-awakening-replay', command: gameCommands.claimQuestReward, payload: null, reply: '📜 Запись уже закрыта\n\nНовая добыча не добавлялась.' },
        { label: 'bad', command: gameCommands.profile, payload: null, reply: 'Команда не распознана.' },
      ],
      logs: [
        { action: 'player_registered' },
        { action: 'player_registered' },
        { action: 'first_school_committed' },
        createLog('return_recap_shown', { nextStepType: 'equip_school_sign' }),
      ],
      questRewardReplaySafe: true,
    });

    expect(summary.logCounts).toEqual({
      player_registered: 2,
      first_school_committed: 1,
      return_recap_shown: 1,
    });
    expect(summary.returnRecapShownCount).toBe(1);
    expect(summary.returnRecapNextStepTypes).toEqual(['equip_school_sign']);
    expect(summary.suspiciousReplyCount).toBe(1);
    expect(summary.trophyCollectionReplyCount).toBe(0);
    expect(summary.questBookReplyCount).toBe(2);
    expect(summary.questRewardClaimReplyCount).toBe(2);
    expect(summary.questRewardReplaySafe).toBe(true);
  });

  it('reports no failures for the completed first-session path', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'payload',
      vkId: 1001,
      player: createPlayer(),
      activeBattle: null,
      pendingRewardOpen: false,
      transcript: [
        { label: 'collect-skin-beast', command: gameCommands.skinBeastReward, payload: null, reply: 'Трофей разобран: Training Wisp.\nВ сумке: +1 эссенция.' },
        { label: 'quest-book', command: gameCommands.questBook, payload: null, reply: '📜 Книга путей\n\nПробуждение Пустого мастера · 🎁 Награда ждёт' },
        { label: 'quest-claim-awakening', command: gameCommands.claimQuestReward, payload: null, reply: '📜 Запись закрыта\n\nВ сумке: +1 обычный осколок.' },
        { label: 'quest-claim-awakening-replay', command: gameCommands.claimQuestReward, payload: null, reply: '📜 Запись уже закрыта\n\nНовая добыча не добавлялась.' },
        { label: 'profile', command: gameCommands.profile, payload: null, reply: 'profile' },
      ],
      logs: [
        { action: 'player_registered' },
        createLog('school_novice_elite_encounter_started', { schoolCode: 'ember' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'stone' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'stone',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'gale' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'gale',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'echo' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'echo',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_follow_up_action_taken', {
          schoolCode: 'stone',
          actionType: 'open_runes',
        }),
        createLog('return_recap_shown', { nextStepType: 'equip_school_sign' }),
      ],
      questRewardReplaySafe: true,
    });

    expect(listLocalPlaytestFailures(summary)).toEqual([]);
  });

  it('reports an unfinished trophy reward after a victory', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'payload',
      vkId: 1001,
      player: createPlayer(),
      activeBattle: null,
      pendingRewardOpen: true,
      transcript: [{ label: 'profile', command: gameCommands.profile, payload: null, reply: 'profile' }],
      logs: [{ action: 'player_registered' }],
    });

    expect(listLocalPlaytestFailures(summary)).toEqual([
      'payload: pending trophy reward is still open',
      'payload: expected a trophy reward collection reply',
      'payload: expected a quest book reply',
      'payload: expected a quest reward claim reply',
      'payload: quest reward replay was not checked',
      'payload: expected return recap evidence',
      'payload: expected ember school novice elite evidence',
      'payload: expected ember school novice aligned reward evidence',
      'payload: expected stone school novice elite evidence',
      'payload: expected stone school novice aligned reward evidence',
      'payload: expected gale school novice elite evidence',
      'payload: expected gale school novice aligned reward evidence',
      'payload: expected echo school novice elite evidence',
      'payload: expected echo school novice aligned reward evidence',
      'payload: expected stone school novice rune hub follow-up',
    ]);
  });

  it('reports missing quest book claim coverage', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'payload',
      vkId: 1001,
      player: createPlayer(),
      activeBattle: null,
      pendingRewardOpen: false,
      transcript: [
        { label: 'collect-skin-beast', command: gameCommands.skinBeastReward, payload: null, reply: 'Трофей разобран: Training Wisp.\nВ сумке: +1 эссенция.' },
        { label: 'profile', command: gameCommands.profile, payload: null, reply: 'profile' },
      ],
      logs: [{ action: 'player_registered' }],
      questRewardReplaySafe: false,
    });

    expect(listLocalPlaytestFailures(summary)).toEqual([
      'payload: expected a quest book reply',
      'payload: expected a quest reward claim reply',
      'payload: quest reward replay was not safe',
      'payload: expected return recap evidence',
      'payload: expected ember school novice elite evidence',
      'payload: expected ember school novice aligned reward evidence',
      'payload: expected stone school novice elite evidence',
      'payload: expected stone school novice aligned reward evidence',
      'payload: expected gale school novice elite evidence',
      'payload: expected gale school novice aligned reward evidence',
      'payload: expected echo school novice elite evidence',
      'payload: expected echo school novice aligned reward evidence',
      'payload: expected stone school novice rune hub follow-up',
    ]);
  });

  it('reports missing school novice path evidence', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'payload',
      vkId: 1001,
      player: createPlayer(),
      activeBattle: null,
      pendingRewardOpen: false,
      transcript: [
        { label: 'collect-skin-beast', command: gameCommands.skinBeastReward, payload: null, reply: 'Трофей разобран: Training Wisp.\nВ сумке: +1 эссенция.' },
        { label: 'quest-book', command: gameCommands.questBook, payload: null, reply: '📜 Книга путей\n\nПробуждение Пустого мастера · 🎁 Награда ждёт' },
        { label: 'quest-claim-awakening', command: gameCommands.claimQuestReward, payload: null, reply: '📜 Запись закрыта\n\nВ сумке: +1 обычный осколок.' },
        { label: 'quest-claim-awakening-replay', command: gameCommands.claimQuestReward, payload: null, reply: '📜 Запись уже закрыта\n\nНовая добыча не добавлялась.' },
        { label: 'profile', command: gameCommands.profile, payload: null, reply: 'profile' },
      ],
      logs: [{ action: 'player_registered' }],
      questRewardReplaySafe: true,
    });

    const normalizedSummary = {
      ...summary,
      trophyCollectionReplyCount: 1,
      questBookReplyCount: 1,
      questRewardClaimReplyCount: 1,
    };

    expect(listLocalPlaytestFailures(normalizedSummary)).toEqual([
      'payload: expected return recap evidence',
      'payload: expected ember school novice elite evidence',
      'payload: expected ember school novice aligned reward evidence',
      'payload: expected stone school novice elite evidence',
      'payload: expected stone school novice aligned reward evidence',
      'payload: expected gale school novice elite evidence',
      'payload: expected gale school novice aligned reward evidence',
      'payload: expected echo school novice elite evidence',
      'payload: expected echo school novice aligned reward evidence',
      'payload: expected stone school novice rune hub follow-up',
    ]);
  });

  it('reports missing stone school novice path evidence', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'payload',
      vkId: 1001,
      player: createPlayer(),
      activeBattle: null,
      pendingRewardOpen: false,
      transcript: [
        { label: 'collect-skin-beast', command: gameCommands.skinBeastReward, payload: null, reply: 'РўСЂРѕС„РµР№ СЂР°Р·РѕР±СЂР°РЅ: Training Wisp.\nР’ СЃСѓРјРєРµ: +1 СЌСЃСЃРµРЅС†РёСЏ.' },
        { label: 'quest-book', command: gameCommands.questBook, payload: null, reply: 'рџ“њ РљРЅРёРіР° РїСѓС‚РµР№\n\nРџСЂРѕР±СѓР¶РґРµРЅРёРµ РџСѓСЃС‚РѕРіРѕ РјР°СЃС‚РµСЂР° В· рџЋЃ РќР°РіСЂР°РґР° Р¶РґС‘С‚' },
        { label: 'quest-claim-awakening', command: gameCommands.claimQuestReward, payload: null, reply: 'рџ“њ Р—Р°РїРёСЃСЊ Р·Р°РєСЂС‹С‚Р°\n\nР’ СЃСѓРјРєРµ: +1 РѕР±С‹С‡РЅС‹Р№ РѕСЃРєРѕР»РѕРє.' },
        { label: 'quest-claim-awakening-replay', command: gameCommands.claimQuestReward, payload: null, reply: 'рџ“њ Р—Р°РїРёСЃСЊ СѓР¶Рµ Р·Р°РєСЂС‹С‚Р°\n\nРќРѕРІР°СЏ РґРѕР±С‹С‡Р° РЅРµ РґРѕР±Р°РІР»СЏР»Р°СЃСЊ.' },
        { label: 'profile', command: gameCommands.profile, payload: null, reply: 'profile' },
      ],
      logs: [
        createLog('school_novice_elite_encounter_started', { schoolCode: 'ember' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'gale' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'gale',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'echo' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'echo',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
      ],
      questRewardReplaySafe: true,
    });

    const normalizedSummary = {
      ...summary,
      trophyCollectionReplyCount: 1,
      questBookReplyCount: 1,
      questRewardClaimReplyCount: 1,
    };

    expect(listLocalPlaytestFailures(normalizedSummary)).toEqual([
      'payload: expected return recap evidence',
      'payload: expected stone school novice elite evidence',
      'payload: expected stone school novice aligned reward evidence',
      'payload: expected stone school novice rune hub follow-up',
    ]);
  });

  it('reports missing gale school novice path evidence', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'payload',
      vkId: 1001,
      player: createPlayer(),
      activeBattle: null,
      pendingRewardOpen: false,
      transcript: [],
      logs: [
        createLog('school_novice_elite_encounter_started', { schoolCode: 'ember' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'stone' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'stone',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'echo' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'echo',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_follow_up_action_taken', {
          schoolCode: 'stone',
          actionType: 'open_runes',
        }),
      ],
      questRewardReplaySafe: true,
    });

    const normalizedSummary = {
      ...summary,
      trophyCollectionReplyCount: 1,
      questBookReplyCount: 1,
      questRewardClaimReplyCount: 1,
    };

    expect(listLocalPlaytestFailures(normalizedSummary)).toEqual([
      'payload: expected return recap evidence',
      'payload: expected gale school novice elite evidence',
      'payload: expected gale school novice aligned reward evidence',
    ]);
  });

  it('reports missing echo school novice path evidence', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'payload',
      vkId: 1001,
      player: createPlayer(),
      activeBattle: null,
      pendingRewardOpen: false,
      transcript: [],
      logs: [
        createLog('school_novice_elite_encounter_started', { schoolCode: 'ember' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'ember',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'stone' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'stone',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_elite_encounter_started', { schoolCode: 'gale' }),
        createLog('reward_claim_applied', {
          isSchoolNoviceAligned: true,
          novicePathSchoolCode: 'gale',
          noviceTargetRewardRarity: 'UNUSUAL',
        }),
        createLog('school_novice_follow_up_action_taken', {
          schoolCode: 'stone',
          actionType: 'open_runes',
        }),
      ],
      questRewardReplaySafe: true,
    });

    const normalizedSummary = {
      ...summary,
      trophyCollectionReplyCount: 1,
      questBookReplyCount: 1,
      questRewardClaimReplyCount: 1,
    };

    expect(listLocalPlaytestFailures(normalizedSummary)).toEqual([
      'payload: expected return recap evidence',
      'payload: expected echo school novice elite evidence',
      'payload: expected echo school novice aligned reward evidence',
    ]);
  });

  it('reports release-blocking failures from the completed first-session path', () => {
    const summary = buildLocalPlaytestSummary({
      scenarioName: 'payload',
      vkId: 1001,
      player: createPlayer({
        victories: 0,
        activeBattleId: 'battle-1',
        runes: [],
      }),
      activeBattle: createBattle(),
      transcript: [{ label: 'profile', command: gameCommands.profile, payload: null, reply: 'Внутренняя ошибка игрового движка.' }],
      logs: [],
    });

    expect(listLocalPlaytestFailures(summary)).toEqual([
      'payload: active battle is still open',
      'payload: expected at least one victory',
      'payload: expected at least one rune',
      'payload: expected an equipped rune',
      'payload: found suspicious bot replies',
      'payload: expected a quest book reply',
      'payload: expected a quest reward claim reply',
      'payload: quest reward replay was not checked',
      'payload: expected return recap evidence',
      'payload: expected ember school novice elite evidence',
      'payload: expected ember school novice aligned reward evidence',
      'payload: expected stone school novice elite evidence',
      'payload: expected stone school novice aligned reward evidence',
      'payload: expected gale school novice elite evidence',
      'payload: expected gale school novice aligned reward evidence',
      'payload: expected echo school novice elite evidence',
      'payload: expected echo school novice aligned reward evidence',
      'payload: expected stone school novice rune hub follow-up',
    ]);
  });
});
