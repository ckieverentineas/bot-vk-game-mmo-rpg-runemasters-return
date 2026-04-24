import { describe, expect, it, vi } from 'vitest';

import type {
  BattleEnemySnapshot,
  BattleView,
  BiomeView,
  MobTemplateView,
  PartyView,
  PlayerState,
  StatBlock,
} from '../../../shared/types/game';
import {
  buildPartyExplorationBattleStart,
  buildSoloExplorationBattleStart,
  resolveStartedExplorationBattleEnemyTurn,
} from './exploration-battle-start';
import type { ExplorationBattleOutcome } from '../domain/exploration-outcome';

const createStats = (overrides: Partial<StatBlock> = {}): StatBlock => ({
  health: 12,
  attack: 4,
  defence: 2,
  magicDefence: 1,
  dexterity: 3,
  intelligence: 2,
  ...overrides,
});

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 3,
  experience: 0,
  gold: 0,
  radiance: 0,
  baseStats: createStats(),
  currentHealth: 12,
  currentMana: 6,
  locationLevel: 2,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 2,
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
  schoolMasteries: [],
  runes: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

const createBiome = (): BiomeView => ({
  id: 1,
  code: 'test-biome',
  name: 'Test biome',
  description: 'A test biome.',
  minLevel: 1,
  maxLevel: 10,
});

const createTemplate = (): MobTemplateView => ({
  code: 'training-slime',
  biomeCode: 'test-biome',
  name: 'Training slime',
  kind: 'slime',
  isElite: false,
  isBoss: false,
  baseStats: createStats(),
  scales: createStats({ health: 1 }),
  baseExperience: 4,
  baseGold: 2,
  runeDropChance: 0,
  lootTable: {},
  attackText: 'hits',
});

const createEnemy = (): BattleEnemySnapshot => ({
  code: 'training-slime',
  name: 'Training slime',
  kind: 'slime',
  isElite: false,
  isBoss: false,
  attack: 2,
  defence: 0,
  magicDefence: 0,
  dexterity: 1,
  intelligence: 0,
  maxHealth: 8,
  currentHealth: 8,
  maxMana: 0,
  currentMana: 0,
  experienceReward: 4,
  goldReward: 2,
  runeDropChance: 0,
  lootTable: {},
  attackText: 'hits',
  intent: null,
  hasUsedSignatureMove: false,
});

const createOutcome = (overrides: Partial<ExplorationBattleOutcome> = {}): ExplorationBattleOutcome => ({
  kind: 'battle',
  biome: createBiome(),
  template: createTemplate(),
  enemy: createEnemy(),
  playerStats: createStats(),
  turnOwner: 'ENEMY',
  openingLog: ['Battle starts.'],
  locationLevel: 2,
  currentSchoolCode: null,
  encounterVariant: null,
  ...overrides,
});

const createParty = (): PartyView => ({
  id: 'party-1',
  inviteCode: 'ABC123',
  leaderPlayerId: 1,
  status: 'OPEN',
  activeBattleId: null,
  maxMembers: 2,
  members: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
});

const createBattleView = (battle: BattleView): BattleView => battle;

describe('exploration battle start builders', () => {
  it('builds a solo encounter choice as a player-owned pending battle', () => {
    const player = createPlayer();
    const outcome = createOutcome({
      encounterVariant: {
        kind: 'AMBUSH',
        title: 'Ambush',
        description: 'Enemy acts first if engaged.',
        effectLine: 'Dangerous opening.',
        initialTurnOwner: 'ENEMY',
      },
    });

    const start = buildSoloExplorationBattleStart({
      player,
      playerVkId: player.vkId,
      outcome,
      enemy: outcome.enemy,
      workshopItems: [],
      offerEncounterChoice: true,
    });

    expect(start.input.battleType).toBe('PVE');
    expect(start.input.turnOwner).toBe('PLAYER');
    expect(start.input.encounter?.status).toBe('OFFERED');
    expect(start.input.encounter?.initialTurnOwner).toBe('ENEMY');
    expect(start.input.player.playerId).toBe(player.playerId);
  });

  it('builds party members and assigns the leader to a pending party encounter', () => {
    const leader = createPlayer();
    const ally = createPlayer({ userId: 2, vkId: 1002, playerId: 2 });
    const outcome = createOutcome();

    const start = buildPartyExplorationBattleStart({
      party: createParty(),
      leader,
      outcome,
      enemy: outcome.enemy,
      members: [
        { player: leader, stats: outcome.playerStats, workshopItems: [] },
        { player: ally, stats: createStats({ attack: 5 }), workshopItems: [] },
      ],
      offerEncounterChoice: true,
    });

    expect(start.input.battleType).toBe('PARTY_PVE');
    expect(start.input.turnOwner).toBe('PLAYER');
    expect(start.input.party?.currentTurnPlayerId).toBe(leader.playerId);
    expect(start.input.party?.members.map((member) => member.playerId)).toEqual([1, 2]);
    expect(start.input.player.playerId).toBe(leader.playerId);
  });

  it('leaves already player-owned starts untouched', async () => {
    const battle = createBattleView({
      id: 'battle-1',
      playerId: 1,
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
      ...buildSoloExplorationBattleStart({
        player: createPlayer(),
        playerVkId: 1001,
        outcome: createOutcome({ turnOwner: 'PLAYER', encounterVariant: null }),
        enemy: createEnemy(),
        workshopItems: [],
        offerEncounterChoice: false,
      }).input,
    });
    const repository = {
      finalizeBattle: vi.fn(),
      saveBattle: vi.fn(),
    };

    await expect(resolveStartedExplorationBattleEnemyTurn({
      repository,
      random: {
        nextInt: vi.fn(),
        rollPercentage: vi.fn(),
        pickOne: vi.fn(),
      },
      battle,
      playerId: 1,
    })).resolves.toBe(battle);
    expect(repository.finalizeBattle).not.toHaveBeenCalled();
    expect(repository.saveBattle).not.toHaveBeenCalled();
  });
});
