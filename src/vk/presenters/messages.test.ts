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
  equippedSlot: 0,
});

const createUnusualReserveRune = () => ({
  id: 'rune-2',
  createdAt: '2026-04-13T00:00:00.000Z',
  ...createDroppedRune(),
  name: 'Необычная руна Пламени',
  rarity: 'UNUSUAL' as const,
  isEquipped: false,
  equippedSlot: null,
});

const createCollectionRune = (name: string, equippedSlot: number | null = null) => ({
  id: `rune-${name}`,
  createdAt: '2026-04-12T00:00:00.000Z',
  ...createDroppedRune(),
  name,
  isEquipped: equippedSlot !== null,
  equippedSlot,
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

  it('shows selected and equipped rune states distinctly on the rune screen', () => {
    const message = renderRuneScreen(createPlayer({
      currentRuneIndex: 1,
      runes: [
        createCollectionRune('Руна A', 0),
        createCollectionRune('Руна B'),
        createCollectionRune('Руна C'),
        createCollectionRune('Руна D'),
        createCollectionRune('Руна E'),
        createCollectionRune('Руна F'),
      ],
    }));

    expect(message).toContain('Быстрый выбор 1-5');
    expect(message).toContain('🧩 Слоты рун: 1/2 открыто сейчас.');
    expect(message).toContain('🛡️ Основа: Руна A');
    expect(message).toContain('🧩 Поддержка: 🔒 откроется на mastery-вехе');
    expect(message).toContain('🎯 Выбрана: Руна B');
    expect(message).toContain('⚔️ Активная руна в бою: Руна A');
    expect(message).toContain('1. 🛡️ Основа · Руна A');
    expect(message).toContain('2. 🎯 Выбрана · Руна B');
    expect(message).toContain('5. ▫️ В запасе · Руна E');
    expect(message).toContain('«🧩 В поддержку» даёт половину статов');
  });

  it('shows unlocked support slot when school mastery opens the second slot', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      schoolMasteries: [{ schoolCode: 'ember', experience: 3, rank: 1 }],
      runes: [
        createCollectionRune('Руна A', 0),
        createCollectionRune('Руна B', 1),
      ],
      currentRuneIndex: 1,
    }));

    expect(message).toContain('🧩 Слоты рун: 2/2 открыто сейчас.');
    expect(message).toContain('🧩 Поддержка: Руна B');
    expect(message).toContain('2. 🎯🧩 Поддержка · Руна B');
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
      victories: 3,
      highestLocationLevel: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🧭 Возвращение');
    expect(message).toContain('Стиль: Школа Пламени · роль штурм.');
    expect(message).toContain('Статус школы: Вы уже прошли первое испытание Пламени');
    expect(message).toContain('Фокус: одержите ещё 2 победы школой Пламени');
    expect(message).toContain('Почему это важно: После «Импульса углей»');
    expect(message).toContain('Дальше: нажмите «⚔️ Исследовать».');
  });

  it('shows school mastery progress in the main menu once a rune is equipped', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      locationLevel: 1,
      schoolMasteries: [{ schoolCode: 'stone', experience: 2, rank: 0 }],
      runes: [{
        ...createEquippedRune(),
        archetypeCode: 'stone',
        passiveAbilityCodes: ['stone_guard'],
        activeAbilityCodes: ['stone_bastion'],
        name: 'Руна Тверди',
      }],
    }));

    expect(message).toContain('Мастерство школы: Твердь · ранг 0 · 2/3');
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
    const message = renderBattle(createBattle(), createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🎯 Следующая цель: одержите ещё 2 победы школой Пламени');
    expect(message).toContain('🜂 Что даст: После «Импульса углей»');
  });

  it('keeps defeat follow-up supportive and without pressure wording', () => {
    const message = renderBattle(createBattle({
      result: 'DEFEAT',
      rewards: null,
      log: ['💥 Поражение.'],
    }), createPlayer({ tutorialState: 'SKIPPED', runes: [createEquippedRune()] }));

    expect(message).toContain('🎯 Следующая цель: проверьте «🔮 Руны» и текущую школу или начните новый бой снова.');
    expect(message).toContain('🜂 Что даст: Так вы спокойнее подготовитесь');
  });

  it('shows the nearest school milestone in the rune hub once mastery progress exists', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🎯 Ближайшая веха: 1/3 до «Разогрев дожима»');
    expect(message).toContain('🜂 Что даст: После «Импульса углей»');
    expect(message).toContain('⭐ Первый знак Пламени: Вы уже прошли первое испытание Пламени');
  });

  it('shows a school novice path milestone before the first unusual school rune is earned', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune()],
    }));

    expect(message).toContain('🎯 Ближайшая веха: Тёмный лес · Пепельная ведунья.');
    expect(message).toContain('🜂 Что даст: Победа может принести первую необычную руну школы Пламени.');
  });

  it('shows an impact recap block in the rune hub when a new rune changes the build', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      runes: [createEquippedRune()],
    }), {
      kind: 'new_rune',
      title: 'Новая руна: Искра Бури',
      changeLine: 'Даёт школе Бури новый темповый ответ после базовой атаки.',
      nextStepLine: 'Откройте «🔮 Руны» и примерьте её в сборке.',
    });

    expect(message).toContain('✨ Что изменилось: Новая руна: Искра Бури.');
    expect(message).toContain('🜂 Теперь: Даёт школе Бури новый темповый ответ после базовой атаки.');
    expect(message).toContain('👉 Попробовать: Откройте «🔮 Руны» и примерьте её в сборке.');
  });

  it('shows support rune contribution in battle text without adding a second active skill promise', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      player: {
        ...createBattle().player,
        runeLoadout: {
          runeId: 'rune-primary-1',
          runeName: 'Руна Пламени',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          schoolMasteryRank: 1,
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: {
            code: 'ember_pulse',
            name: 'Импульс углей',
            manaCost: 3,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
        supportRuneLoadout: {
          runeId: 'rune-support-1',
          runeName: 'Искра поддержки',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          schoolMasteryRank: 0,
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: null,
        },
      },
    }));

    expect(message).toContain('🧩 Поддержка: Искра поддержки');
    expect(message).toContain('усиливает давление базовой атаки');
    expect(message).toContain('пока не даёт вторую боевую кнопку');
  });

  it('shows an impact recap block in battle result when a reward changes the build', () => {
    const message = renderBattle(createBattle(), createPlayer({
      tutorialState: 'SKIPPED',
      runes: [createEquippedRune()],
    }), {
      kind: 'slot_unlock',
      title: 'Открыт слот поддержки',
      changeLine: 'Сборка стала шире: теперь можно усилить школу второй руной поддержки без второй боевой кнопки.',
      nextStepLine: 'Откройте «🔮 Руны» и поставьте руну поддержки.',
    });

    expect(message).toContain('✨ Что изменилось: Открыт слот поддержки.');
    expect(message).toContain('🜂 Теперь: Сборка стала шире: теперь можно усилить школу второй руной поддержки без второй боевой кнопки.');
    expect(message).toContain('👉 Попробовать: Откройте «🔮 Руны» и поставьте руну поддержки.');
  });

  it('celebrates the first aligned school trial completion in battle result', () => {
    const message = renderBattle(createBattle({
      enemy: {
        ...createBattle().enemy,
        code: 'ash-seer',
        name: 'Пепельная ведунья',
        kind: 'mage',
        isElite: true,
      },
    }), createPlayer({
      tutorialState: 'SKIPPED',
      runes: [createEquippedRune()],
    }), {
      kind: 'school_trial_completed',
      title: 'Испытание школы пройдено',
      changeLine: 'Пламя признало вашу решимость. Теперь школа отвечает вам не только давлением, но и настоящим стилем боя через первую необычную руну.',
      nextStepLine: 'Откройте «🔮 Руны», наденьте первый знак школы и закрепите стиль в следующем бою.',
    });

    expect(message).toContain('✨ Что изменилось: Испытание школы пройдено.');
    expect(message).toContain('Пламя признало вашу решимость');
    expect(message).toContain('👉 Попробовать: Откройте «🔮 Руны», наденьте первый знак школы');
  });
});
