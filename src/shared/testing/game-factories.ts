import type {
  BattleEnemySnapshot,
  BattlePartySnapshot,
  BattlePlayerSnapshot,
  BattleView,
  BiomeView,
  InventoryView,
  MobTemplateView,
  PartyView,
  PlayerState,
  RuneDraft,
  RuneView,
  StatBlock,
} from '../types/game';

export const testTimestamp = '2026-04-12T00:00:00.000Z';

export const createTestStatBlock = (overrides: Partial<StatBlock> = {}): StatBlock => ({
  health: 8,
  attack: 4,
  defence: 3,
  magicDefence: 1,
  dexterity: 3,
  intelligence: 1,
  ...overrides,
});

export const createTestInventory = (overrides: Partial<InventoryView> = {}): InventoryView => ({
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
  healingPills: 0,
  focusPills: 0,
  guardPills: 0,
  clarityPills: 0,
  ...overrides,
});

export const createTestRuneDraft = (overrides: Partial<RuneDraft> = {}): RuneDraft => ({
  runeCode: 'rune-1',
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name: 'Test ember rune',
  rarity: 'USUAL',
  isEquipped: false,
  equippedSlot: null,
  ...createTestStatBlock({
    health: 1,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  }),
  ...overrides,
});

export const createTestRune = (overrides: Partial<RuneView> = {}): RuneView => ({
  id: 'rune-1',
  createdAt: testTimestamp,
  ...createTestRuneDraft(),
  ...overrides,
});

export const createTestPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  name: 'Рунный мастер #1001',
  level: 1,
  experience: 0,
  gold: 0,
  radiance: 0,
  baseStats: createTestStatBlock(),
  locationLevel: 0,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 0,
  victoryStreak: 0,
  defeats: 0,
  defeatStreak: 0,
  mobsKilled: 0,
  highestLocationLevel: 0,
  tutorialState: 'ACTIVE',
  inventory: createTestInventory(),
  runes: [],
  createdAt: testTimestamp,
  updatedAt: testTimestamp,
  ...overrides,
});

export const createTestBattlePlayerSnapshot = (
  overrides: Partial<BattlePlayerSnapshot> = {},
): BattlePlayerSnapshot => ({
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
  ...overrides,
});

export const createTestBattleEnemySnapshot = (
  overrides: Partial<BattleEnemySnapshot> = {},
): BattleEnemySnapshot => ({
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
  lootTable: {},
  attackText: 'touches with a spark',
  intent: null,
  hasUsedSignatureMove: false,
  ...overrides,
});

export const createTestBattlePartySnapshot = (
  overrides: Partial<BattlePartySnapshot> = {},
): BattlePartySnapshot => {
  const leader = createTestBattlePlayerSnapshot();
  const ally = createTestBattlePlayerSnapshot({
    playerId: 2,
    name: 'Test ally',
  });

  return {
    id: 'party-1',
    inviteCode: 'ABC123',
    leaderPlayerId: 1,
    currentTurnPlayerId: 1,
    enemyTargetPlayerId: null,
    actedPlayerIds: [],
    members: [
      { playerId: 1, vkId: 1001, name: leader.name, snapshot: leader },
      { playerId: 2, vkId: 1002, name: ally.name, snapshot: ally },
    ],
    ...overrides,
  };
};

export const createTestBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 0,
  locationLevel: 0,
  biomeCode: 'initium',
  enemyCode: 'training-wisp',
  turnOwner: 'PLAYER',
  player: createTestBattlePlayerSnapshot(),
  enemy: createTestBattleEnemySnapshot(),
  encounter: null,
  log: [],
  result: null,
  rewards: null,
  createdAt: testTimestamp,
  updatedAt: testTimestamp,
  ...overrides,
});

export const createTestParty = (overrides: Partial<PartyView> = {}): PartyView => ({
  id: 'party-1',
  inviteCode: 'ABC123',
  leaderPlayerId: 1,
  status: 'OPEN',
  activeBattleId: null,
  maxMembers: 2,
  members: [
    {
      playerId: 1,
      vkId: 1001,
      name: 'Test player',
      role: 'LEADER',
      joinedAt: testTimestamp,
    },
  ],
  createdAt: testTimestamp,
  updatedAt: testTimestamp,
  ...overrides,
});

export const createTestBiome = (overrides: Partial<BiomeView> = {}): BiomeView => ({
  id: 1,
  code: 'dark-forest',
  name: 'Dark Forest',
  description: 'A quiet test biome.',
  minLevel: 1,
  maxLevel: 15,
  ...overrides,
});

export const createTestMobTemplate = (
  overrides: Partial<MobTemplateView> = {},
): MobTemplateView => ({
  code: 'blue-slime',
  biomeCode: 'dark-forest',
  name: 'Blue Slime',
  kind: 'slime',
  isElite: false,
  isBoss: false,
  baseStats: createTestStatBlock({
    health: 6,
    attack: 2,
    defence: 0,
    magicDefence: 0,
    dexterity: 1,
    intelligence: 1,
  }),
  scales: createTestStatBlock({
    health: 1,
    attack: 1,
    defence: 1,
    magicDefence: 1,
    dexterity: 1,
    intelligence: 1,
  }),
  baseExperience: 6,
  baseGold: 2,
  runeDropChance: 0,
  lootTable: {},
  attackText: 'hits with a soft body',
  ...overrides,
});
