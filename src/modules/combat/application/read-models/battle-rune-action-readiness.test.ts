import { describe, expect, it } from 'vitest';

import type { BattleView } from '../../../../shared/types/game';
import { buildBattleRuneActionReadinessView } from './battle-rune-action-readiness';

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'ACTIVE',
  battleType: 'PVE',
  actionRevision: 1,
  locationLevel: 1,
  biomeCode: 'dark-forest',
  enemyCode: 'forest-wolf',
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
    code: 'forest-wolf',
    name: 'Лесной волк',
    kind: 'wolf',
    isElite: false,
    isBoss: false,
    attack: 3,
    defence: 1,
    magicDefence: 0,
    dexterity: 3,
    intelligence: 0,
    maxHealth: 8,
    currentHealth: 8,
    maxMana: 0,
    currentMana: 0,
    experienceReward: 8,
    goldReward: 3,
    runeDropChance: 10,
    attackText: 'кусает',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['⚔️ Бой начался.'],
  result: null,
  rewards: null,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  ...overrides,
});

const ability = {
  code: 'ember_pulse',
  name: 'Импульс углей',
  manaCost: 3,
  cooldownTurns: 2,
  currentCooldown: 0,
};

describe('buildBattleRuneActionReadinessView', () => {
  it('shows a ready rune with its mana cost', () => {
    const readiness = buildBattleRuneActionReadinessView(createBattle(), ability);

    expect(readiness).toMatchObject({
      reason: 'ready',
      isReady: true,
      buttonSuffix: ' · 3 маны',
      screenState: 'готово: стоит 3 маны; мана 4/4',
    });
  });

  it('explains cooldown without hiding mana cost', () => {
    const readiness = buildBattleRuneActionReadinessView(createBattle(), {
      ...ability,
      currentCooldown: 2,
    });

    expect(readiness.reason).toBe('cooldown');
    expect(readiness.isReady).toBe(false);
    expect(readiness.buttonSuffix).toBe(' · КД 2 · 3 маны');
    expect(readiness.screenState).toBe('недоступно: откат 2 хода; мана 4/4, стоимость 3');
  });

  it('explains missing mana as current mana against the cost', () => {
    const readiness = buildBattleRuneActionReadinessView(createBattle({
      player: {
        ...createBattle().player,
        currentMana: 1,
      },
    }), ability);

    expect(readiness.reason).toBe('not_enough_mana');
    expect(readiness.isReady).toBe(false);
    expect(readiness.buttonSuffix).toBe(' · мана 1/3');
    expect(readiness.screenState).toBe('недоступно: не хватает маны 1/3; откат готов');
  });

  it('shows wrong timing separately from cooldown and mana facts', () => {
    const readiness = buildBattleRuneActionReadinessView(createBattle({
      turnOwner: 'ENEMY',
    }), {
      ...ability,
      currentCooldown: 1,
    });

    expect(readiness.reason).toBe('wrong_moment');
    expect(readiness.isReady).toBe(false);
    expect(readiness.buttonSuffix).toBe(' · ход врага · КД 1');
    expect(readiness.screenState).toBe('не тот момент: сейчас ход врага; мана 4/4, стоимость 3; откат 1 ход');
  });
});
