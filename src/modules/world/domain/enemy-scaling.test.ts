import { describe, expect, it } from 'vitest';

import type { BattleEnemySnapshot, BiomeView, MobTemplateView } from '../../../shared/types/game';
import { describeEncounter, pickEncounterTemplate, resolveInitialTurnOwner } from './enemy-scaling';

const createTemplate = (overrides: Partial<MobTemplateView> = {}): MobTemplateView => ({
  code: 'blue-slime',
  biomeCode: 'dark-forest',
  name: 'Синий слизень',
  kind: 'slime',
  isElite: false,
  isBoss: false,
  baseStats: {
    health: 12,
    attack: 3,
    defence: 1,
    magicDefence: 0,
    dexterity: 2,
    intelligence: 1,
  },
  scales: {
    health: 1.14,
    attack: 1.08,
    defence: 1.08,
    magicDefence: 1.04,
    dexterity: 1.06,
    intelligence: 1.02,
  },
  baseExperience: 10,
  baseGold: 4,
  runeDropChance: 18,
  lootTable: {},
  attackText: 'шлёпает студенистым телом',
  ...overrides,
});

const createEnemy = (overrides: Partial<BattleEnemySnapshot> = {}): BattleEnemySnapshot => ({
  code: 'ash-seer',
  name: 'Пепельная ведунья',
  kind: 'mage',
  isElite: true,
  isBoss: false,
  attack: 7,
  defence: 2,
  magicDefence: 4,
  dexterity: 5,
  intelligence: 8,
  maxHealth: 24,
  currentHealth: 24,
  maxMana: 32,
  currentMana: 32,
  experienceReward: 24,
  goldReward: 9,
  runeDropChance: 28,
  attackText: 'выпускает пепельный прорыв',
  intent: null,
  hasUsedSignatureMove: false,
  ...overrides,
});

const createBiome = (): BiomeView => ({
  id: 1,
  code: 'dark-forest',
  name: 'Тёмный лес',
  description: 'Стартовая чаща для новых мастеров рун.',
  minLevel: 1,
  maxLevel: 15,
});

describe('resolveInitialTurnOwner', () => {
  it('даёт игроку первый ход при близкой разнице в ловкости', () => {
    expect(resolveInitialTurnOwner(3, 4)).toBe('PLAYER');
  });

  it('оставляет первый ход врагу при явном перевесе в ловкости', () => {
    expect(resolveInitialTurnOwner(3, 6)).toBe('ENEMY');
  });
});

describe('pickEncounterTemplate', () => {
  it('prefers the ember school elite early when the player already fights as Пламя', () => {
    const templates = [
      createTemplate(),
      createTemplate({ code: 'ash-seer', name: 'Пепельная ведунья', kind: 'mage', isElite: true }),
      createTemplate({ code: 'stonehorn-ram', name: 'Камнерогий таран', kind: 'boar', isElite: true }),
    ];

    const picked = pickEncounterTemplate(templates, 4, { schoolCode: 'ember' }, {
      rollPercentage: (chance) => chance > 0,
      pickOne: (items) => items[0]!,
    });

    expect(picked.code).toBe('ash-seer');
  });

  it('prefers the stone school elite early when the player already fights as Твердь', () => {
    const templates = [
      createTemplate(),
      createTemplate({ code: 'ash-seer', name: 'Пепельная ведунья', kind: 'mage', isElite: true }),
      createTemplate({ code: 'stonehorn-ram', name: 'Камнерогий таран', kind: 'boar', isElite: true }),
    ];

    const picked = pickEncounterTemplate(templates, 4, { schoolCode: 'stone' }, {
      rollPercentage: (chance) => chance > 0,
      pickOne: (items) => items[0]!,
    });

    expect(picked.code).toBe('stonehorn-ram');
  });

  it('prefers the echo school elite early when the player already fights as Прорицание', () => {
    const templates = [
      createTemplate(),
      createTemplate({ code: 'blind-augur', name: 'Слепой авгур', kind: 'spirit', isElite: true }),
      createTemplate({ code: 'ash-seer', name: 'Пепельная ведунья', kind: 'mage', isElite: true }),
    ];

    const picked = pickEncounterTemplate(templates, 4, { schoolCode: 'echo' }, {
      rollPercentage: (chance) => chance > 0,
      pickOne: (items) => items[0]!,
    });

    expect(picked.code).toBe('blind-augur');
  });

  it('prefers the gale school elite early when the player already fights as Буря', () => {
    const templates = [
      createTemplate(),
      createTemplate({ code: 'storm-lynx', name: 'Шквальная рысь', kind: 'wolf', isElite: true }),
      createTemplate({ code: 'stonehorn-ram', name: 'Камнерогий таран', kind: 'boar', isElite: true }),
    ];

    const picked = pickEncounterTemplate(templates, 4, { schoolCode: 'gale' }, {
      rollPercentage: (chance) => chance > 0,
      pickOne: (items) => items[0]!,
    });

    expect(picked.code).toBe('storm-lynx');
  });

  it('prefers the ember school miniboss once the first sign is already equipped', () => {
    const templates = [
      createTemplate(),
      createTemplate({ code: 'ash-matron', name: 'Пепельная матрона', kind: 'mage', isElite: true, isBoss: true }),
      createTemplate({ code: 'granite-warden', name: 'Гранитный страж', kind: 'knight', isElite: true, isBoss: true }),
    ];

    const picked = pickEncounterTemplate(templates, 6, { schoolCode: 'ember', preferMiniboss: true }, {
      rollPercentage: (chance) => chance > 0,
      pickOne: (items) => items[0]!,
    });

    expect(picked.code).toBe('ash-matron');
  });

  it('prefers the gale school miniboss once the first sign is already equipped', () => {
    const templates = [
      createTemplate(),
      createTemplate({ code: 'squall-lord', name: 'Владыка шквала', kind: 'spirit', isElite: true, isBoss: true }),
      createTemplate({ code: 'ash-matron', name: 'Пепельная матрона', kind: 'mage', isElite: true, isBoss: true }),
    ];

    const picked = pickEncounterTemplate(templates, 6, { schoolCode: 'gale', preferMiniboss: true }, {
      rollPercentage: (chance) => chance > 0,
      pickOne: (items) => items[0]!,
    });

    expect(picked.code).toBe('squall-lord');
  });
});

describe('describeEncounter', () => {
  it('adds a school-specific ember hint for the ash seer', () => {
    const description = describeEncounter(createBiome(), createEnemy(), 'ember');

    expect(description).toContain('Пепельная ведунья');
    expect(description).toContain('первое испытание школы Пламени');
  });

  it('adds a generic hint when the enemy pressure does not match the player school', () => {
    const description = describeEncounter(
      createBiome(),
      createEnemy({ code: 'stonehorn-ram', name: 'Камнерогий таран', kind: 'boar' }),
      'ember',
    );

    expect(description).toContain('Камнерогий таран');
    expect(description).toContain('тяжёлый удар');
  });

  it('adds a school-specific hint for the ember miniboss', () => {
    const description = describeEncounter(
      createBiome(),
      createEnemy({ code: 'ash-matron', name: 'Пепельная матрона', isBoss: true }),
      'ember',
    );

    expect(description).toContain('Пепельная матрона');
    expect(description).toContain('большой бой Пламени');
  });

  it('adds a school-specific hint for the gale miniboss', () => {
    const description = describeEncounter(
      createBiome(),
      createEnemy({ code: 'squall-lord', name: 'Владыка шквала', kind: 'spirit', isBoss: true }),
      'gale',
    );

    expect(description).toContain('Владыка шквала');
    expect(description).toContain('большой бой Бури');
  });

  it('adds a school-specific hint for the echo novice elite', () => {
    const description = describeEncounter(
      createBiome(),
      createEnemy({ code: 'blind-augur', name: 'Слепой авгур', kind: 'spirit' }),
      'echo',
    );

    expect(description).toContain('Слепой авгур');
    expect(description).toContain('первое испытание школы Прорицания');
  });

  it('adds a school-specific hint for the gale novice elite', () => {
    const description = describeEncounter(
      createBiome(),
      createEnemy({ code: 'storm-lynx', name: 'Шквальная рысь', kind: 'wolf' }),
      'gale',
    );

    expect(description).toContain('Шквальная рысь');
    expect(description).toContain('первое испытание школы Бури');
  });
});
