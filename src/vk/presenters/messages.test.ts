import { describe, expect, it } from 'vitest';

import type { BattleView, PlayerState, RuneDraft } from '../../shared/types/game';
import { renderBattle, renderLocation, renderMainMenu, renderReturnRecap, renderRuneScreen, renderWelcome } from './messages';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  userId: 1,
  vkId: 1001,
  playerId: 1,
  level: 1,
  experience: 0,
  gold: 0,
  baseStats: {
    health: 8,
    attack: 4,
    defence: 3,
    magicDefence: 1,
    dexterity: 3,
    intelligence: 1,
  },
  allocationPoints: {
    health: 0,
    attack: 0,
    defence: 0,
    magicDefence: 0,
    dexterity: 0,
    intelligence: 0,
  },
  unspentStatPoints: 1,
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
  inventory: {
    usualShards: 25,
    unusualShards: 10,
    rareShards: 3,
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

const createDroppedRune = (): RuneDraft => ({
  runeCode: 'rune-1',
  archetypeCode: 'ember',
  passiveAbilityCodes: ['ember_heart'],
  activeAbilityCodes: ['ember_pulse'],
  name: 'Обычная руна Пламени',
  rarity: 'USUAL',
  isEquipped: false,
  health: 1,
  attack: 2,
  defence: 0,
  magicDefence: 0,
  dexterity: 0,
  intelligence: 0,
});

const createEquippedRune = () => ({
  id: 'rune-1',
  createdAt: '2026-04-12T00:00:00.000Z',
  ...createDroppedRune(),
  isEquipped: true,
});

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => ({
  id: 'battle-1',
  playerId: 1,
  status: 'COMPLETED',
  battleType: 'PVE',
  actionRevision: 1,
  locationLevel: 0,
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
    currentHealth: 0,
    maxMana: 4,
    currentMana: 4,
    experienceReward: 6,
    goldReward: 2,
    runeDropChance: 0,
    attackText: 'касается искрой',
    intent: null,
    hasUsedSignatureMove: false,
  },
  log: ['🏆 Победа!'],
  result: 'VICTORY',
  rewards: {
    experience: 6,
    gold: 2,
    shards: { USUAL: 2 },
    droppedRune: null,
  },
  createdAt: '2026-04-12T00:00:00.000Z',
  updatedAt: '2026-04-12T00:00:00.000Z',
  ...overrides,
});

describe('messages school-first onboarding framing', () => {
  it('adds school-first framing to the welcome screen', () => {
    const message = renderWelcome(createPlayer(), true);

    expect(message).toContain('базовая атака → первая боевая руна → школа рун');
    ['Пламя', 'Твердь', 'Буря', 'Прорицание'].forEach((schoolName) => {
      expect(message).toContain(schoolName);
    });
  });

  it('explains the school-first tutorial flow in the location screen', () => {
    const message = renderLocation(createPlayer());

    expect(message).toContain('базовой атакой');
    expect(message).toContain('первую руну');
    ['Пламя', 'Твердь', 'Буря', 'Прорицание'].forEach((schoolName) => {
      expect(message).toContain(schoolName);
    });
  });

  it('points tutorial objective at opening the first school', () => {
    const message = renderMainMenu(createPlayer());

    expect(message).toContain('заберите первую боевую руну и откройте свою школу рун');
  });

  it('teases schools on the empty rune screen', () => {
    const message = renderRuneScreen(createPlayer());

    expect(message).toContain('Первая боевая руна откроет школу рун');
    ['Пламя', 'Твердь', 'Буря', 'Прорицание'].forEach((schoolName) => {
      expect(message).toContain(schoolName);
    });
  });

  it('keeps skipped players on the adventure path even with stale intro location state', () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 0 });

    const welcome = renderWelcome(player, false);
    const menu = renderMainMenu(player);
    const location = renderLocation(player);

    expect(welcome).toContain('🧭 Возвращение');
    expect(welcome).toContain('Дальше: нажмите «⚔️ Исследовать»');
    expect(welcome).not.toContain('Ваш мастер уже существует');
    expect(welcome).not.toContain('учебная зона доступна для спокойной тренировки');
    expect(menu).not.toContain('Первый бой ведёт к первой руне');
    expect(location).toContain('Обучение уже пропущено');
    expect(location).toContain('Сейчас открыт режим приключений');
    expect(location).toContain('Исследовать');
  });

  it('keeps completed players on the adventure path even with stale intro location state', () => {
    const player = createPlayer({ tutorialState: 'COMPLETED', locationLevel: 0 });

    const recap = renderReturnRecap(player);
    const location = renderLocation(player);

    expect(recap).toContain('🧭 Возвращение');
    expect(recap).toContain('Дальше: нажмите «⚔️ Исследовать»');
    expect(recap).not.toContain('Учебный бой');
    expect(location).toContain('Обучение уже завершено');
    expect(location).toContain('Сейчас открыт режим приключений');
  });

  it('builds a calm return recap from current state and equipped school', () => {
    const message = renderReturnRecap(createPlayer({
      tutorialState: 'SKIPPED',
      locationLevel: 1,
      unspentStatPoints: 1,
      highestLocationLevel: 3,
      runes: [createEquippedRune()],
    }));

    expect(message).toContain('🧭 Возвращение');
    expect(message).toContain('Стиль: Школа Пламени · роль штурм.');
    expect(message).toContain('Фокус: откройте профиль');
    expect(message).toContain('Дальше: нажмите «👤 Профиль».');
  });

  it('keeps active tutorial recap focused on the first training battle', () => {
    const message = renderReturnRecap(createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 }));

    expect(message).toContain('до первой руны и школы рун остался один шаг');
    expect(message).toContain('Дальше: нажмите «⚔️ Учебный бой».');
  });

  it('keeps return recap and post-session guidance free from guilt/fomo wording', () => {
    const recap = renderReturnRecap(createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }));
    const defeat = renderBattle(createBattle({ result: 'DEFEAT', rewards: null, log: ['💥 Поражение.'] }));
    const victory = renderBattle(createBattle());

    [recap, defeat, victory].forEach((message) => {
      expect(message).not.toContain('ритм');
      expect(message).not.toContain('темп');
      expect(message).not.toContain('пока вас не было');
      expect(message).not.toContain('не упуст');
    });
  });

  it('adds a school-aware next goal after victory with a rune drop', () => {
    const message = renderBattle(createBattle({
      rewards: {
        ...createBattle().rewards!,
        droppedRune: createDroppedRune(),
      },
    }));

    expect(message).toContain('🎯 Следующая цель: откройте «🔮 Руны» и наденьте новую руну.');
    expect(message).toContain('усилите стиль боя');
  });

  it('adds a forward-looking next goal after victory without a rune drop', () => {
    const message = renderBattle(createBattle());

    expect(message).toContain('🎯 Следующая цель: начните «⚔️ Новый бой»');
    expect(message).toContain('расширять сборку');
  });

  it('keeps defeat follow-up supportive and without pressure wording', () => {
    const message = renderBattle(createBattle({
      result: 'DEFEAT',
      rewards: null,
      log: ['💥 Поражение.'],
    }));

    expect(message).toContain('🎯 Следующая цель: усилите героя в «👤 Профиль» или начните новый бой снова.');
    expect(message).toContain('спокойнее подготовитесь');
  });
});
