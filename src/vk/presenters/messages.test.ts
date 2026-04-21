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

const createEquippedUnusualRune = () => ({
  ...createEquippedRune(),
  name: 'Необычная руна Пламени',
  rarity: 'UNUSUAL' as const,
});

const createEquippedRareRune = () => ({
  ...createEquippedRune(),
  name: 'Редкая руна Пламени',
  rarity: 'RARE' as const,
});

const createEquippedRareGaleRune = () => ({
  ...createEquippedRune(),
  archetypeCode: 'gale',
  passiveAbilityCodes: [],
  activeAbilityCodes: ['gale_step'],
  name: 'Редкая руна Бури',
  rarity: 'RARE' as const,
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

    expect(message).toContain('Руны: 6 · карусель 1/2 · по 5');
    expect(message).toContain('🧩 Слоты рун: 2 открыто сейчас.');
    expect(message).toContain('Надето: 1. Руна A · 2. пусто');
    expect(message).toContain('🎯 Выбрана: Руна B');
    expect(message).toContain('1. ✅ Надета 1 · Руна A');
    expect(message).toContain('2. 🎯 Выбрана · Руна B');
    expect(message).toContain('5. ▫️ В коллекции · Руна E');
    expect(message).not.toContain('Выберите слот 1-5');
  });

  it('shows an equipped second rune as a full slot in the carousel', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      schoolMasteries: [{ schoolCode: 'ember', experience: 3, rank: 1 }],
      runes: [
        createCollectionRune('Руна A', 0),
        createCollectionRune('Руна B', 1),
      ],
      currentRuneIndex: 1,
    }));

    expect(message).toContain('🧩 Слоты рун: 2 открыто сейчас.');
    expect(message).toContain('Надето: 1. Руна A · 2. Руна B');
    expect(message).toContain('2. 🎯✅ Надета 2 · Руна B');
  });

  it('keeps skipped players on the adventure path even with stale intro location state', () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 0 });

    const welcome = renderWelcome(player, false);
    const menu = renderMainMenu(player);
    const location = renderLocation(player);

    expect(welcome).toContain('🧭 Возвращение');
    expect(welcome).toContain('🧭 Дальше: нажмите «⚔️ Исследовать»');
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
    expect(recap).toContain('🧭 Дальше: нажмите «⚔️ Исследовать»');
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
      runes: [createEquippedRareRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🧭 Возвращение');
    expect(message).toContain('Стиль: Школа Пламени · роль штурм.');
    expect(message).toContain('Статус школы: Вы уже пережили большой бой Пламени: школа доверила вам печать давления и дожима');
    expect(message).toContain('🎯 Следующая цель: одержите ещё 2 победы школой Пламени');
    expect(message).toContain('🜂 Что это даст: После «Импульса углей»');
    expect(message).toContain('🧭 Дальше: нажмите «⚔️ Исследовать».');
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
    expect(message).toContain('🧭 Дальше: нажмите «⚔️ Учебный бой».');
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
    expect(message).toContain('👉 Дальше: нажмите «🔮 Руны».');
  });

  it('adds a forward-looking next goal after victory without a rune drop', () => {
    const message = renderBattle(createBattle(), createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRareRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🎯 Следующая цель: одержите ещё 2 победы школой Пламени');
    expect(message).toContain('👉 Дальше: нажмите «⚔️ Новый бой».');
  });

  it('keeps defeat follow-up supportive and without pressure wording', () => {
    const message = renderBattle(createBattle({
      result: 'DEFEAT',
      rewards: null,
      log: ['💥 Поражение.'],
    }), createPlayer({ tutorialState: 'SKIPPED', runes: [createEquippedRune()] }));

    expect(message).toContain('🎯 Следующая цель: проверьте «🔮 Руны» и текущую школу или начните новый бой снова.');
    expect(message).toContain('👉 Дальше: нажмите «🔮 Руны».');
  });

  it('shows the nearest school milestone in the rune hub once mastery progress exists', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRareRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🎯 Ближайшая веха: 1/3 до «Разогрев дожима»');
    expect(message).toContain('⭐ Печать Пламени: активен.');
    expect(message).toContain('👉 Сделать шаг: нажмите «⚔️ Исследовать».');
  });

  it('shows school sign equip guidance after recognition if the unusual rune is still not equipped', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('⭐ Первый знак Пламени: ждёт в рунах.');
    expect(message).toContain('🎯 Ближайшая веха: «Необычная руна Пламени» уже ждёт в коллекции рун.');
    expect(message).toContain('👉 Сделать шаг: нажмите «🔮 Руны».');
  });

  it('surfaces a direct school-test CTA after the first sign is equipped', () => {
    const player = createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedUnusualRune()],
    });

    expect(renderReturnRecap(player)).toContain('🧭 Дальше: нажмите «⚔️ Проверить школу».');
    expect(renderMainMenu(player)).toContain('👉 Сделать шаг: нажмите «⚔️ Проверить школу».');
    expect(renderRuneScreen(player)).toContain('👉 Сделать шаг: нажмите «⚔️ Проверить школу».');
    expect(renderBattle(createBattle(), player)).toContain('👉 Дальше: нажмите «⚔️ Проверить школу».');
  });

  it('guides the player to equip the school seal after the miniboss reward if the rare rune is still in reserve', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 5,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedUnusualRune(), {
        ...createUnusualReserveRune(),
        id: 'rune-3',
        runeCode: 'rune-3',
        name: 'Редкая руна Пламени',
        rarity: 'RARE',
      }],
    }));

    expect(message).toContain('⭐ Печать Пламени: ждёт в рунах.');
    expect(message).toContain('🎯 Ближайшая веха: «Редкая руна Пламени» уже ждёт в коллекции рун.');
    expect(message).toContain('👉 Сделать шаг: нажмите «🔮 Руны».');
  });

  it('shows the school miniboss milestone once the first sign is already equipped', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 4,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedUnusualRune()],
    }));

    expect(message).toContain('🎯 Ближайшая веха: Тёмный лес · Пепельная матрона.');
    expect(message).toContain('👉 Сделать шаг: нажмите «⚔️ Проверить школу».');
  });

  it('shows a school novice path milestone before the first unusual school rune is earned', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune()],
    }));

    expect(message).toContain('🎯 Ближайшая веха: Тёмный лес · Пепельная ведунья.');
    expect(message).toContain('👉 Сделать шаг: нажмите «⚔️ Исследовать».');
  });

  it('shows an echo novice path milestone once the player reaches Прорицание without an unusual rune yet', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 1,
      schoolMasteries: [{ schoolCode: 'echo', experience: 1, rank: 0 }],
      runes: [{
        ...createEquippedRune(),
        archetypeCode: 'echo',
        passiveAbilityCodes: ['echo_mind'],
        activeAbilityCodes: [],
        name: 'Руна Прорицания',
      }],
    }));

    expect(message).toContain('🎯 Ближайшая веха: Тёмный лес · Слепой авгур.');
    expect(message).toContain('👉 Сделать шаг: нажмите «⚔️ Исследовать».');
  });

  it('shows a gale novice path milestone once the player reaches Буря without an unusual rune yet', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 1,
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
      runes: [{
        ...createEquippedRune(),
        archetypeCode: 'gale',
        passiveAbilityCodes: [],
        activeAbilityCodes: ['gale_step'],
        name: 'Руна Бури',
      }],
    }));

    expect(message).toContain('🎯 Ближайшая веха: Тёмный лес · Шквальная рысь.');
    expect(message).toContain('👉 Сделать шаг: нажмите «⚔️ Исследовать».');
  });

  it('shows gale seal recognition once the rare gale rune is already equipped', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 5,
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
      runes: [createEquippedRareGaleRune()],
    }));

    expect(message).toContain('⭐ Печать Бури: активен.');
  });

  it('shows echo seal recognition once the rare echo rune is already equipped', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 5,
      schoolMasteries: [{ schoolCode: 'echo', experience: 1, rank: 0 }],
      runes: [{
        ...createEquippedRune(),
        archetypeCode: 'echo',
        passiveAbilityCodes: ['echo_mind'],
        activeAbilityCodes: [],
        name: 'Редкая руна Прорицания',
        rarity: 'RARE',
      }],
    }));

    expect(message).toContain('⭐ Печать Прорицания: активен.');
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
    expect(message).toContain('👉 Дальше: Откройте «🔮 Руны» и примерьте её в сборке.');
  });

  it('shows both rune slots in battle text and actions', () => {
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
          runeId: 'rune-slot-2-1',
          runeName: 'Искра Бури',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          schoolMasteryRank: 0,
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: {
            code: 'gale_step',
            name: 'Шаг шквала',
            manaCost: 2,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
      },
    }));

    expect(message).toContain('🌀 Слот 1: Импульс углей — готово');
    expect(message).toContain('🌀 Слот 2: Шаг шквала — готово');
    expect(message).toContain('🎮 Действия: ⚔️ Атака · 🛡️ Защита (+2 щит) · 🌀 1: Импульс углей · 🌀 2: Шаг шквала');
  });

  it('shows a compact combat clarity state line during the active player turn', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      enemy: {
        ...createBattle().enemy,
        currentHealth: 3,
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующий удар будет сильнее.',
          bonusAttack: 2,
        },
      },
      player: {
        ...createBattle().player,
        currentHealth: 6,
        guardPoints: 3,
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Руна Пламени',
          archetypeCode: 'ember',
          archetypeName: 'Штурм',
          schoolCode: 'ember',
          passiveAbilityCodes: ['ember_heart'],
          activeAbility: {
            code: 'ember_pulse',
            name: 'Импульс углей',
            manaCost: 3,
            cooldownTurns: 2,
            currentCooldown: 1,
          },
        },
      },
    }));

    expect(message).toContain('Состояние');
    expect(message).toContain('Вы: Рунный мастер #1001');
    expect(message).toContain('❤️ 🟩🟩🟩🟩🟩🟩🟩🟩⬛⬛ 6/8 HP · 🛡️ щит 3');
    expect(message).toContain('🔷 🟦🟦🟦🟦🟦🟦 4/4 маны');
    expect(message).toContain('📊 Статы: ⚔️ 4 · 🛡️ 3 · 🔮 1 · 💨 3 · 🧠 1');
    expect(message).toContain('Враг: Учебный огонёк');
    expect(message).toContain('❤️ 🟨🟨🟨🟨🟨⬛⬛⬛⬛⬛ 3/6 HP');
    expect(message).toContain('📊 Статы: ⚔️ 2 · 🛡️ 0 · 🔮 0 · 💨 2 · 🧠 1');
    expect(message).toContain('Тактика');
    expect(message).toContain('🔥 Пламя: враг уже просел');
  });

  it('shows the last two battle events as a readable timeline', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      log: [
        '🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.',
        '🧭 Путевой эпизод: вы находите свежие следы.',
        '⚔️ Вы наносите 4 урона врагу Синий слизень.',
      ],
    }));

    expect(message).toContain('Ход событий');
    expect(message).toContain('• 🧭 Путевой эпизод: вы находите свежие следы.');
    expect(message).toContain('• ⚔️ Вы наносите 4 урона врагу Синий слизень.');
    expect(message).not.toContain('• 🗺️ Тёмный лес');
  });

  it('shows an echo-specific combat clarity hint around revealed intent', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'GUARD_BREAK',
          title: 'Guard-break',
          description: 'Следующий удар хуже проходит через защиту.',
          bonusAttack: 1,
          shattersGuard: true,
        },
      },
      player: {
        ...createBattle().player,
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Руна Прорицания',
          archetypeCode: 'echo',
          archetypeName: 'Провидец',
          schoolCode: 'echo',
          passiveAbilityCodes: ['echo_mind'],
          activeAbility: null,
        },
      },
    }));

    expect(message).toContain('🧠 Прорицание: раскрытая угроза даёт лучшее окно для точного ответа');
  });

  it('shows an impact recap block in battle result when a reward changes the build', () => {
    const message = renderBattle(createBattle(), createPlayer({
      tutorialState: 'SKIPPED',
      runes: [createEquippedRune()],
    }), {
      kind: 'slot_unlock',
      title: 'Открыт новый слот рун',
      changeLine: 'Сборка стала шире: теперь можно надеть ещё одну полноценную руну.',
      nextStepLine: 'Откройте «🔮 Руны» и выберите, какой слот занять новой руной.',
    });

    expect(message).toContain('✨ Что изменилось: Открыт новый слот рун.');
    expect(message).toContain('👉 Дальше: Откройте «🔮 Руны» и выберите, какой слот занять новой руной.');
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
    expect(message).toContain('👉 Дальше: Откройте «🔮 Руны», наденьте первый знак школы');
  });
});
