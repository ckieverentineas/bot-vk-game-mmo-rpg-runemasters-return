import { describe, expect, it } from 'vitest';

import type { BattleView, PlayerState } from '../../../../shared/types/game';
import { buildDefeatFlowView } from './defeat-flow';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 4,
  experience: 12,
  gold: 10,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
  },
  currentHealth: 3,
  currentMana: 2,
  locationLevel: 3,
  currentRuneIndex: 0,
  activeBattleId: null,
  victories: 3,
  victoryStreak: 0,
  defeats: 1,
  defeatStreak: 1,
  mobsKilled: 3,
  highestLocationLevel: 4,
  tutorialState: 'SKIPPED',
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
      name: 'Руна Пламени',
      rarity: 'USUAL',
      isEquipped: true,
      equippedSlot: 0,
      health: 1,
      attack: 2,
      defence: 0,
      magicDefence: 0,
      dexterity: 0,
      intelligence: 0,
      createdAt: '2026-04-12T00:00:00.000Z',
    },
  ],
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'COMPLETED',
  battleType: 'PVE',
  actionRevision: 3,
  locationLevel: 3,
  biomeCode: 'dark-forest',
  enemyCode: 'forest-wolf',
  turnOwner: 'ENEMY',
  player: {
    playerId: 1,
    name: 'Рунный мастер #1001',
    attack: 6,
    defence: 3,
    magicDefence: 1,
    dexterity: 2,
    intelligence: 1,
    maxHealth: 9,
    currentHealth: 0,
    maxMana: 4,
    currentMana: 0,
    runeLoadout: null,
    guardPoints: 0,
  },
  enemy: {
    code: 'forest-wolf',
    name: 'Лесной волк',
    kind: 'wolf',
    isElite: false,
    isBoss: false,
    attack: 4,
    defence: 1,
    magicDefence: 0,
    dexterity: 3,
    intelligence: 1,
    maxHealth: 12,
    currentHealth: 5,
    maxMana: 4,
    currentMana: 4,
    experienceReward: 10,
    goldReward: 4,
    runeDropChance: 12,
    attackText: 'кусает',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['💥 Поражение.'],
  result: 'DEFEAT',
  rewards: null,
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('buildDefeatFlowView', () => {
  it('explains defeat consequences, preserved state and the safe route', () => {
    const flow = buildDefeatFlowView(createBattle(), createPlayer());

    expect(flow?.consequenceLine).toContain('победная добыча за «Лесной волк» не начислена');
    expect(flow?.preservedLine).toContain('руны, пыль, материалы, уровень, школа и задания остаются');
    expect(flow?.recoveryLine).toContain('3/9 HP');
    expect(flow?.recoveryLine).toContain('2/4 маны');
    expect(flow?.safeRouteLine).toContain('«🔮 Руны»');
    expect(flow?.safeRouteLine).toContain('«⚔️ Осторожно дальше»');
    expect(flow?.safeRouteLine).toContain('без школьного испытания и верхнего бродяги');
  });

  it('does not render for victory results', () => {
    expect(buildDefeatFlowView(createBattle({ result: 'VICTORY' }), createPlayer())).toBeNull();
  });
});
