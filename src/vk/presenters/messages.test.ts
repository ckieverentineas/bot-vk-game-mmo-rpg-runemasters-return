import { describe, expect, it } from 'vitest';

import type { BattleView, PlayerState, RuneDraft } from '../../shared/types/game';
import {
  renderBattle,
  renderCollectedPendingReward,
  renderExplorationEvent,
  renderLocation,
  renderMainMenu,
  renderPendingReward,
  renderProfile,
  renderReturnRecap,
  renderRuneDetailScreen,
  renderRuneScreen,
  renderWelcome,
} from './messages';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import type { CollectPendingRewardView } from '../../modules/rewards/application/use-cases/CollectPendingReward';

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

const createPendingReward = (overrides: Partial<PendingRewardView> = {}): PendingRewardView => ({
  ledgerKey: 'battle-victory:battle-1',
  source: {
    battleId: 'battle-1',
    enemyCode: 'forest-wolf',
    enemyName: 'Лесной волк',
    enemyKind: 'wolf',
  },
  snapshot: {
    schemaVersion: 1,
    intentId: 'battle-victory:battle-1',
    sourceType: 'BATTLE_VICTORY',
    sourceId: 'battle-1',
    playerId: 1,
    status: 'PENDING',
    baseReward: {
      experience: 14,
      gold: 5,
      shards: { USUAL: 2 },
      droppedRune: null,
    },
    trophyActions: [
      {
        code: 'skin_beast',
        label: '🔪 Свежевать',
        skillCodes: ['gathering.skinning'],
        visibleRewardFields: ['leather', 'bone'],
        reward: {
          inventoryDelta: { leather: 2, bone: 1 },
          skillPoints: [{ skillCode: 'gathering.skinning', points: 1 }],
        },
      },
      {
        code: 'claim_all',
        label: '🎒 Забрать добычу',
        skillCodes: [],
        visibleRewardFields: [],
        reward: {
          inventoryDelta: { leather: 2, bone: 1 },
          skillPoints: [],
        },
      },
    ],
    selectedActionCode: null,
    appliedResult: null,
    createdAt: '2026-04-22T00:00:00.000Z',
  },
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

  it('shows standalone exploration resource effects without battle controls', () => {
    const message = renderExplorationEvent({
      code: 'abandoned-camp',
      kind: 'resource_find',
      kindLabel: 'находка',
      title: '🎒 Брошенный привал',
      directorLine: '🎲 Мастер снабжения отмечает находку: малый материал полезен мастерской, но не заменяет рост через бои, руны и школы.',
      description: 'Под навесом из корней лежит малый запас трав.',
      outcomeLine: 'Боя нет: вы находите малый запас трав.',
      nextStepLine: 'Дальше можно снова исследовать маршрут.',
      effect: {
        kind: 'inventory_delta',
        delta: { herb: 1 },
        line: 'Найдено: трава +1.',
      },
    }, createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }));

    expect(message).toContain('Знак: находка');
    expect(message).toContain('Мастер снабжения');
    expect(message).toContain('Найдено: трава +1.');
    expect(message).not.toContain('Ответ мастера:');
  });

  it('teases schools on the empty rune screen', () => {
    const message = renderRuneScreen(createPlayer());

    expect(message).toContain('Первая боевая руна откроет школу рун');
    ['Пламя', 'Твердь', 'Буря', 'Прорицание'].forEach((schoolName) => {
      expect(message).toContain(schoolName);
    });
  });

  it('shows a compact rune list before opening a rune card', () => {
    const player = createPlayer({
      currentRuneIndex: 1,
      runes: [
        createCollectionRune('Руна A', 0),
        createCollectionRune('Руна B'),
        createCollectionRune('Руна C'),
        createCollectionRune('Руна D'),
        createCollectionRune('Руна E'),
        createCollectionRune('Руна F'),
      ],
    });
    const message = renderRuneScreen(player);
    const detail = renderRuneDetailScreen(player);

    expect(message).toContain('🔮 Руны:');
    expect(message).toContain('🧩 Рун надето ✅1/2');
    expect(message).toContain('1. 🔥 Руна A · ✅ слот 1 · Пламя · ⚔️ Штурм');
    expect(message).toContain('2. 🔥 Руна B · Пламя · ⚔️ Штурм');
    expect(message).toContain('5. 🔥 Руна E');
    expect(message).toContain('Страница 1 из 2');
    expect(message).not.toContain('Список рун:');
    expect(message).not.toContain('Слоты рун:');
    expect(message).not.toContain('Надето:');
    expect(message).not.toContain('Активный навык:');

    expect(detail).toContain('🔮 Руна');
    expect(detail).toContain('Руна 2 из 6');
    expect(detail).toContain('🎯 Выбрана');
    expect(detail).toContain('Руна: Руна B');
    expect(detail).toContain('Активный навык:');
    expect(detail).toContain('🌀 Импульс углей · 3 маны · КД 2');
    expect(detail).toContain('Базовый активный рунный навык архетипа огня.');
    expect(detail).toContain('Пассивные эффекты:');
    expect(detail).toContain('🛡️ Сердце углей');
    expect(detail).toContain('Пассивно усиливает атакующее давление владельца руны.');
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

    expect(message).toContain('🧩 Рун надето ✅2/2');
    expect(message).toContain('1. 🔥 Руна A · ✅ слот 1');
    expect(message).toContain('2. 🔥 Руна B · ✅ слот 2');
    expect(message).not.toContain('Надето:');
  });

  it('normalizes legacy rune names and shows school icons in the rune list', () => {
    const message = renderRuneScreen(createPlayer({
      runes: [{
        ...createCollectionRune('Обычная руна руна Бури', 1),
        archetypeCode: 'gale',
        passiveAbilityCodes: [],
        activeAbilityCodes: ['gale_step'],
        health: 0,
        attack: 0,
        defence: 0,
        magicDefence: 0,
        dexterity: 1,
        intelligence: 0,
      }],
    }));

    expect(message).toContain('1. 🌪️ Обычная руна Бури · ✅ слот 2 · Буря · 💨 Налётчик · ЛВК +1');
    expect(message).not.toContain('руна руна');
  });

  it('keeps skipped players on the adventure path even with stale intro location state', () => {
    const player = createPlayer({ tutorialState: 'SKIPPED', locationLevel: 0 });

    const welcome = renderWelcome(player, false);
    const menu = renderMainMenu(player);
    const location = renderLocation(player);

    expect(welcome).toContain('🧭 Возвращение');
    expect(welcome).toContain('🧭 Дальше: «⚔️ Исследовать»');
    expect(welcome).not.toContain('Ваш мастер уже существует');
    expect(welcome).not.toContain('учебная зона доступна для спокойной тренировки');
    expect(menu).not.toContain('Первый бой ведёт к первой руне');
    expect(location).toContain('Учебный круг оставлен позади');
    expect(location).toContain('Дороги открыты');
    expect(location).toContain('Исследовать');
  });

  it('keeps completed players on the adventure path even with stale intro location state', () => {
    const player = createPlayer({ tutorialState: 'COMPLETED', locationLevel: 0 });

    const recap = renderReturnRecap(player);
    const location = renderLocation(player);

    expect(recap).toContain('🧭 Возвращение');
    expect(recap).toContain('🧭 Дальше: «⚔️ Исследовать»');
    expect(recap).not.toContain('Учебный бой');
    expect(location).toContain('Учебный круг завершён');
    expect(location).toContain('Дороги открыты');
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
    expect(message).toContain('🎯 След: проверьте печать школы Пламени на цели печати');
    expect(message).toContain('🜂 Зачем идти: Печать уже даёт +1 к давлению базовой атаки');
    expect(message).toContain('🧭 Дальше: «⚔️ Цель печати».');
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

  it('shows action-based skills in the profile', () => {
    const message = renderProfile(createPlayer({
      skills: [
        {
          skillCode: 'gathering.essence_extraction',
          experience: 1,
          rank: 0,
        },
        {
          skillCode: 'gathering.skinning',
          experience: 100,
          rank: 1,
        },
      ],
    }));

    expect(message).toContain('Навыки:');
    expect(message).toContain('Свежевание: Практик свежевания · ранг закреплён');
    expect(message).toContain('Извлечение эссенции: Новичок извлечения эссенции · первые успехи');
    expect(message).not.toContain('ранг 1 · 100 опыта');
    expect(message).not.toContain('ранг 0 · 1/100');
  });

  it('keeps the profile explicit when action-based skills are still empty', () => {
    const message = renderProfile(createPlayer());

    expect(message).toContain('Навыки: пока нет опыта обработки трофеев.');
  });

  it('keeps active tutorial recap focused on the first training battle', () => {
    const message = renderReturnRecap(createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 }));

    expect(message).toContain('до первой руны и школы остался один бой');
    expect(message).toContain('🧭 Дальше: «⚔️ Учебный бой».');
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

    expect(message).toContain('🎯 След: откройте «🔮 Руны» и наденьте новую руну.');
    expect(message).toContain('👉 Дальше: «🔮 Руны».');
  });

  it('adds a forward-looking next goal after victory without a rune drop', () => {
    const message = renderBattle(createBattle(), createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRareRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🎯 След: проверьте печать школы Пламени на цели печати');
    expect(message).toContain('👉 Дальше: «⚔️ Цель печати».');
  });

  it('keeps defeat follow-up supportive and without pressure wording', () => {
    const message = renderBattle(createBattle({
      result: 'DEFEAT',
      rewards: null,
      log: ['💥 Поражение.'],
    }), createPlayer({
      tutorialState: 'SKIPPED',
      currentHealth: 3,
      currentMana: 2,
      defeatStreak: 1,
      runes: [createEquippedRune()],
    }));

    expect(message).toContain('🛟 После поражения');
    expect(message).toContain('Не получено: победная добыча за «Учебный огонёк» не начислена');
    expect(message).toContain('Сохранено: руны, пыль, материалы, уровень, школа и задания остаются у вас.');
    expect(message).toContain('Восстановление: вы поднялись до 3/9 HP и 2/4 маны.');
    expect(message).toContain('Безопасный путь: сначала «🔮 Руны»');
    expect(message).toContain('«⚔️ Осторожно дальше»');
    expect(message).toContain('без школьного испытания и верхнего бродяги');
    expect(message).toContain('🎯 След: проверьте «🔮 Руны», затем вернитесь через осторожную встречу.');
    expect(message).toContain('👉 Дальше: «🔮 Руны».');
  });

  it('shows the nearest school milestone in the main menu once mastery progress exists', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRareRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('⭐ Печать Пламени: Вы уже пережили большой бой Пламени');
    expect(message).toContain('🎯 След: проверьте печать школы Пламени на цели печати');
    expect(message).toContain('👉 Сделать шаг: «⚔️ Цель печати».');
  });

  it('shows school sign equip guidance after recognition if the unusual rune is still not equipped', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('⭐ Первый знак Пламени: Вы уже прошли первое испытание Пламени.');
    expect(message).toContain('Первый знак школы ждёт в рунах');
    expect(message).toContain('🎯 След: откройте «🔮 Руны» и наденьте первый знак школы Пламени.');
    expect(message).toContain('👉 Сделать шаг: «🔮 Руны».');
  });

  it('keeps the school sign visible when the rune hub is opened from the payoff handoff', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      currentRuneIndex: 0,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🎯 След: откройте «🔮 Руны» и наденьте первый знак школы Пламени.');
    expect(message).toContain('В фокусе: «Необычная руна Пламени».');
  });

  it('keeps the first-sign follow-up under the normal explore CTA', () => {
    const player = createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedUnusualRune()],
    });

    expect(renderReturnRecap(player)).toContain('🧭 Дальше: «⚔️ Исследовать».');
    expect(renderMainMenu(player)).toContain('👉 Сделать шаг: «⚔️ Исследовать».');
    expect(renderRuneScreen(player)).not.toContain('Проверить школу');
    expect(renderBattle(createBattle(), player)).toContain('👉 Дальше: «⚔️ Исследовать».');
  });

  it('guides the player to equip the school seal after the miniboss reward if the rare rune is still in reserve', () => {
    const message = renderMainMenu(createPlayer({
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

    expect(message).toContain('⭐ Печать Пламени: Вы уже пережили большой бой Пламени.');
    expect(message).toContain('Печать школы ждёт в рунах');
    expect(message).toContain('🎯 След: откройте «🔮 Руны» и наденьте печать школы Пламени.');
    expect(message).toContain('👉 Сделать шаг: «🔮 Руны».');
  });

  it('shows the school miniboss milestone once the first sign is already equipped', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 4,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedUnusualRune()],
    }));

    expect(message).toContain('🎯 След: разыщите Пепельную матрону');
    expect(message).toContain('👉 Сделать шаг: «⚔️ Исследовать».');
  });

  it('shows a school novice path milestone before the first unusual school rune is earned', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune()],
    }));

    expect(message).toContain('🎯 След: разыщите Пепельную ведунью');
    expect(message).toContain('👉 Сделать шаг: «⚔️ Исследовать».');
  });

  it('shows an echo novice path milestone once the player reaches Прорицание without an unusual rune yet', () => {
    const message = renderMainMenu(createPlayer({
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

    expect(message).toContain('🎯 След: разыщите Слепого авгура');
    expect(message).toContain('👉 Сделать шаг: «⚔️ Исследовать».');
  });

  it('shows a gale novice path milestone once the player reaches Буря without an unusual rune yet', () => {
    const message = renderMainMenu(createPlayer({
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

    expect(message).toContain('🎯 След: разыщите Шквальную рысь');
    expect(message).toContain('👉 Сделать шаг: «⚔️ Исследовать».');
  });

  it('shows gale seal recognition once the rare gale rune is already equipped', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 5,
      schoolMasteries: [{ schoolCode: 'gale', experience: 1, rank: 0 }],
      runes: [createEquippedRareGaleRune()],
    }));

    expect(message).toContain('⭐ Печать Бури: Вы уже пережили большой бой Бури');
  });

  it('shows echo seal recognition once the rare echo rune is already equipped', () => {
    const message = renderMainMenu(createPlayer({
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

    expect(message).toContain('⭐ Печать Прорицания: Вы уже пережили большой бой Прорицания');
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

    expect(message).toContain('✨ Перемена: Новая руна: Искра Бури.');
    expect(message).toContain('👉 Следом: Откройте «🔮 Руны» и примерьте её в сборке.');
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

    expect(message).toContain('🌀 Слот 1: Импульс углей — готово: стоит 3 маны; мана 4/4');
    expect(message).toContain('🌀 Слот 2: Шаг шквала — готово: стоит 2 маны; мана 4/4');
    expect(message).toContain('⚔️ Ответ мастера: ⚔️ Атака · 🛡️ Защита (+2 щит) · 🌀 1: Импульс углей · 3 маны · 🌀 2: Шаг шквала · 2 маны');
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

    expect(message).toContain('Поле боя');
    expect(message).toContain('Вы: Рунный мастер #1001');
    expect(message).toContain('❤️ 🟩🟩🟩🟩🟩🟩🟩🟩⬛⬛ 6/8 HP · 🛡️ щит 3');
    expect(message).toContain('🔷 🟦🟦🟦🟦🟦🟦 4/4 маны');
    expect(message).toContain('📊 Черты: ⚔️ 4 · 🛡️ 3 · 🔮 1 · 💨 3 · 🧠 1');
    expect(message).toContain('Враг: Учебный огонёк');
    expect(message).toContain('❤️ 🟨🟨🟨🟨🟨⬛⬛⬛⬛⬛ 3/6 HP');
    expect(message).toContain('📊 Черты: ⚔️ 2 · 🛡️ 0 · 🔮 0 · 💨 2 · 🧠 1');
    expect(message).toContain('Чтение боя');
    expect(message).toContain('🎲 Выбор: тяжёлый удар лучше встретить защитой');
    expect(message).toContain('🌀 Слот 1: Импульс углей — недоступно: откат 1 ход; мана 4/4, стоимость 3');
    expect(message).toContain('🛡️ Защита (+4 щит)');
    expect(message).toContain('🌀 1: Импульс углей · КД 1 · 3 маны');
    expect(message).toContain('🔥 Пламя: враг уже просел');
  });

  it('explains missing mana and wrong timing for active runes on the battle screen', () => {
    const lowManaMessage = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      player: {
        ...createBattle().player,
        maxMana: 4,
        currentMana: 1,
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
            currentCooldown: 0,
          },
        },
      },
    }));
    const enemyTurnMessage = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      turnOwner: 'ENEMY',
      player: {
        ...createBattle().player,
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
            currentCooldown: 0,
          },
        },
      },
    }));

    expect(lowManaMessage).toContain('🌀 Слот 1: Импульс углей — недоступно: не хватает маны 1/3; откат готов');
    expect(lowManaMessage).toContain('🌀 1: Импульс углей · мана 1/3');
    expect(enemyTurnMessage).toContain('🌀 Слот 1: Импульс углей — не тот момент: сейчас ход врага; мана 4/4, стоимость 3; откат готов');
    expect(enemyTurnMessage).not.toContain('⚔️ Ответ мастера:');
  });

  it('shows an encounter decision before normal battle tactics', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'ENEMY',
        canFlee: true,
        fleeChancePercent: 52,
      },
    }));

    expect(message).toContain('🧭 Встреча');
    expect(message).toContain('Развилка');
    expect(message).toContain('Тропа назад: 52%');
    expect(message).toContain('враг успеет начать первым');
    expect(message).not.toContain('Чтение боя');
    expect(message).not.toContain('⚔️ Ответ мастера:');
  });

  it('shows the full battle log newest-first while it remains short enough to read', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      log: [
        '🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.',
        '🧭 Путевой эпизод: вы находите свежие следы.',
        '🌀 Импульс углей прожигает Синий слизень на 8 урона.',
        '⚠️ Синий слизень готовит «Кислотный прорыв». Защита на следующий ход сработает хуже обычного.',
        '💙 Рунный фокус: +1 маны.',
      ],
    }));

    expect(message).toContain('Летопись схватки');
    expect(message).toContain('• 🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.');
    expect(message).toContain('• 🧭 Путевой эпизод: вы находите свежие следы.');
    expect(message).toContain('• 🌀 Импульс углей прожигает Синий слизень на 8 урона.');
    expect(message).toContain('• ⚠️ Синий слизень готовит «Кислотный прорыв». Защита на следующий ход сработает хуже обычного.');
    expect(message).toContain('• 💙 Рунный фокус: +1 маны.');
    expect(message.indexOf('• 💙 Рунный фокус: +1 маны.')).toBeLessThan(
      message.indexOf('• 🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.'),
    );
  });

  it('compacts long battle logs newest-first without losing the opening and latest events', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      log: [
        '🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.',
        '🧭 Путевой эпизод: вы находите свежие следы.',
        '⚔️ Вы наносите 4 урона врагу Синий слизень.',
        '⚠️ Синий слизень готовит «Кислотный прорыв».',
        '💙 Рунный фокус: +1 маны.',
        '🌀 Импульс углей прожигает Синий слизень на 8 урона.',
        '🛡️ Защита смягчает удар на 2 урона.',
        '👾 Синий слизень бьёт и наносит 1 урона.',
        '⚔️ Вы наносите 5 урона врагу Синий слизень.',
        '🏆 Победа!',
      ],
    }));

    expect(message).toContain('• 🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.');
    expect(message).toContain('… ещё 2 события между нынешним мигом и началом схватки');
    expect(message).not.toContain('• 🧭 Путевой эпизод: вы находите свежие следы.');
    expect(message).not.toContain('• ⚔️ Вы наносите 4 урона врагу Синий слизень.');
    expect(message).toContain('• ⚠️ Синий слизень готовит «Кислотный прорыв».');
    expect(message).toContain('• 🏆 Победа!');
    expect(message.indexOf('• 🏆 Победа!')).toBeLessThan(
      message.indexOf('• 🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.'),
    );
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

    expect(message).toContain('🎲 Выбор: пробивающий удар ломает стойку');
    expect(message).toContain('🧠 Прорицание: «Guard-break» уже прочитан');
  });

  it('shows school-aware guard value for stone stance in battle actions', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      enemy: {
        ...createBattle().enemy,
        intent: {
          code: 'HEAVY_STRIKE',
          title: 'Тяжёлый удар',
          description: 'Следующий удар будет сильнее.',
          bonusAttack: 2,
        },
      },
      player: {
        ...createBattle().player,
        runeLoadout: {
          runeId: 'rune-1',
          runeName: 'Руна Тверди',
          archetypeCode: 'stone',
          archetypeName: 'Страж',
          schoolCode: 'stone',
          schoolMasteryRank: 1,
          passiveAbilityCodes: ['stone_guard'],
          activeAbility: {
            code: 'stone_bastion',
            name: 'Каменный отпор',
            manaCost: 2,
            cooldownTurns: 2,
            currentCooldown: 0,
          },
        },
      },
    }));

    expect(message).toContain('🛡️ Защита (+8 щит)');
    expect(message).toContain('🪨 Твердь: тяжёлый удар лучше держать защитой');
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

    expect(message).toContain('✨ Перемена: Открыт новый слот рун.');
    expect(message).toContain('👉 Следом: Откройте «🔮 Руны» и выберите, какой слот занять новой руной.');
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

    expect(message).toContain('✨ Перемена: Испытание школы пройдено.');
    expect(message).toContain('👉 Следом: Откройте «🔮 Руны», наденьте первый знак школы');
  });

  it('renders a pending trophy card with meaningful action previews', () => {
    const message = renderPendingReward(createPendingReward());

    expect(message).toContain('🏁 Трофеи победы');
    expect(message).toContain('Лесной волк повержен');
    expect(message).toContain('Уже ваше: +14 опыта · +5 пыли · +2 обычных осколка.');
    expect(message).toContain('🔪 Свежевать — +2 кожи · +1 кость; мастерство: Свежевание.');
    expect(message).toContain('🎒 Забрать добычу — +2 кожи · +1 кость; мастерство: без роста навыка.');
  });

  it('renders collected trophy results and the next player goal', () => {
    const result: CollectPendingRewardView = {
      player: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      playerBeforeCollect: createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }),
      pendingReward: createPendingReward(),
      ledgerKey: 'battle-victory:battle-1',
      selectedActionCode: 'skin_beast',
      appliedResult: {
        baseRewardApplied: true,
        inventoryDelta: { leather: 2, bone: 1 },
        skillUps: [
          {
            skillCode: 'gathering.skinning',
            experienceBefore: 3,
            experienceAfter: 4,
            rankBefore: 0,
            rankAfter: 0,
          },
        ],
        statUps: [],
        schoolUps: [],
      },
    };

    const message = renderCollectedPendingReward(result);

    expect(message).toContain('🔪 Свежевать');
    expect(message).toContain('В сумке: +2 кожи · +1 кость.');
    expect(message).toContain('Свежевание: Новичок свежевания · первые успехи крепнут');
    expect(message).not.toContain('Свежевание: 3 → 4');
    expect(message).toContain('👉 Дальше: «⚔️ Исследовать».');
  });

  it('renders the collected trophy result as a handoff to equipping the school sign', () => {
    const player = createPlayer({
      tutorialState: 'SKIPPED',
      locationLevel: 3,
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune(), createUnusualReserveRune()],
    });
    const result: CollectPendingRewardView = {
      player,
      playerBeforeCollect: createPlayer({
        tutorialState: 'SKIPPED',
        locationLevel: 3,
        victories: 3,
        schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
        runes: [createEquippedRune()],
      }),
      pendingReward: createPendingReward(),
      ledgerKey: 'battle-victory:battle-school-1',
      selectedActionCode: 'extract_essence',
      appliedResult: {
        baseRewardApplied: true,
        inventoryDelta: { essence: 1 },
        skillUps: [],
        statUps: [],
        schoolUps: [],
      },
    };

    const message = renderCollectedPendingReward(result);

    expect(message).toContain('🎯 След: откройте «🔮 Руны» и наденьте первый знак школы Пламени.');
    expect(message).toContain('👉 Дальше: «🔮 Руны».');
  });
});
