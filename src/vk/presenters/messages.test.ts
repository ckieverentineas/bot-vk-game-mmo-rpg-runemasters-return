import { describe, expect, it } from 'vitest';

import {
  createTestBattle,
  createTestBattleEnemySnapshot,
  createTestBattlePlayerSnapshot,
  createTestInventory,
  createTestPlayer,
  createTestRuneDraft,
} from '../../shared/testing/game-factories';
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
  renderAltar,
  renderRuneDetailScreen,
  renderRuneScreen,
  renderSchoolMastery,
  renderWelcome,
  renderWorkshop,
} from './messages';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import type { CollectPendingRewardView } from '../../modules/rewards/application/use-cases/CollectPendingReward';
import { getWorkshopBlueprint } from '../../modules/workshop/domain/workshop-catalog';

const createPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => createTestPlayer({
  inventory: createTestInventory({
    usualShards: 25,
    unusualShards: 10,
    rareShards: 3,
  }),
  ...overrides,
});

const createDroppedRune = (): RuneDraft => createTestRuneDraft({
  name: 'Обычная руна Пламени',
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

const createBattle = (overrides: Partial<BattleView> = {}): BattleView => createTestBattle({
  status: 'COMPLETED',
  actionRevision: 1,
  player: createTestBattlePlayerSnapshot({ name: 'Рунный мастер #1001' }),
  enemy: createTestBattleEnemySnapshot({
    name: 'Учебный огонёк',
    currentHealth: 0,
    attackText: 'касается искрой',
    lootTable: undefined,
  }),
  log: ['🏆 Победа!'],
  result: 'VICTORY',
  rewards: {
    experience: 6,
    gold: 2,
    shards: { USUAL: 2 },
    droppedRune: null,
  },
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

    expect(message).toContain('Маршрут: удар -> первая руна -> школа -> стиль боя.');
    ['Пламя', 'Твердь', 'Буря', 'Прорицание'].forEach((schoolName) => {
      expect(message).toContain(schoolName);
    });
  });

  it('explains the school-first tutorial flow in the location screen', () => {
    const message = renderLocation(createPlayer());

    expect(message).toContain('Цель: победить Учебный огонёк.');
    expect(message).toContain('Награда: первая руна и школа.');
    ['Пламя', 'Твердь', 'Буря', 'Прорицание'].forEach((schoolName) => {
      expect(message).toContain(schoolName);
    });
  });

  it('points tutorial objective at opening the first school', () => {
    const message = renderMainMenu(createPlayer());

    expect(message).toContain('заберите первую боевую руну и откройте свою школу рун');
  });

  it('points a wounded player toward recovery instead of the normal route', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      locationLevel: 4,
      currentHealth: 2,
      currentMana: 1,
      runes: [createEquippedRune()],
    }));

    expect(message).toContain('💡 След: найдите передышку');
    expect(message).toContain('💡 Сделать шаг: «🌿 Передышка».');
  });

  it('shows standalone exploration resource effects without battle controls', () => {
    const message = renderExplorationEvent({
      code: 'abandoned-camp',
      kind: 'resource_find',
      kindLabel: 'находка',
      title: '🎒 Брошенный привал',
      directorLine: '🎲 Мастер снабжения отмечает находку: малый материал пригодится у алтаря, но не заменяет рост через бои, руны и школы.',
      description: 'Под навесом из корней лежит малый запас трав.',
      outcomeLine: 'Боя нет: вы находите малый запас трав.',
      nextStepLine: 'Дальше можно снова исследовать маршрут.',
      effect: {
        kind: 'inventory_delta',
        delta: { herb: 1 },
        line: 'Найдено: трава +1.',
      },
    }, createPlayer({ tutorialState: 'SKIPPED', locationLevel: 1 }));

    expect(message).toContain('🏷️ находка');
    expect(message).toContain('Мастер снабжения');
    expect(message).toContain('🎁 Найдено: трава +1.');
    expect(message).not.toContain('Ответ мастера:');
  });

  it('teases schools on the empty rune screen', () => {
    const message = renderRuneScreen(createPlayer());

    expect(message).toContain('Первая боевая руна откроет школу.');
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
    const altar = renderAltar(player);

    expect(message).toContain('🔮 Руны');
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
    expect(detail).toContain('🔮 Руна B');
    expect(detail).toContain('⚡ Активно:');
    expect(detail).toContain('🌀 Импульс углей · 3 маны · КД 2');
    expect(detail).toContain('Удар угольной вспышкой');
    expect(detail).toContain('🛡️ Пассивно:');
    expect(detail).toContain('🛡️ Сердце углей');
    expect(detail).toContain('Уголь в груди держит жар атаки');

    expect(altar).toContain('🕯 Алтарь рун');
    expect(altar).toContain('Фокус: руна 2 из 6');
    expect(altar).toContain('🕯 Создание: 10 оск. · 18 пыли.');
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
    expect(welcome).toContain('💡 Дальше: «⚔️ Исследовать»');
    expect(welcome).not.toContain('Ваш мастер уже существует');
    expect(welcome).not.toContain('учебная зона доступна для спокойной тренировки');
    expect(menu).not.toContain('Первый бой ведёт к первой руне');
    expect(location).toContain('📘 Обучение пропущено.');
    expect(location).toContain('Дальше: обычное исследование.');
    expect(location).toContain('Исследовать');
  });

  it('keeps completed players on the adventure path even with stale intro location state', () => {
    const player = createPlayer({ tutorialState: 'COMPLETED', locationLevel: 0 });

    const recap = renderReturnRecap(player);
    const location = renderLocation(player);

    expect(recap).toContain('🧭 Возвращение');
    expect(recap).toContain('💡 Дальше: «⚔️ Исследовать»');
    expect(recap).not.toContain('Учебный бой');
    expect(location).toContain('📘 Обучение завершено.');
    expect(location).toContain('Дальше: обычное исследование.');
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
    expect(message).toContain('🔮 Школа Пламени · штурм.');
    expect(message).toContain('⭐ Вы уже пережили большой бой Пламени: школа доверила вам печать давления и дожима');
    expect(message).toContain('💡 След: проверьте печать школы Пламени на цели печати');
    expect(message).toContain('💡 Дальше: «⚔️ Цель печати».');
    expect(message).not.toContain('💡 Печать уже даёт +1 к давлению базовой атаки');
  });

  it('keeps school mastery details out of the main menu once a rune is equipped', () => {
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

    expect(message).not.toContain('Мастерство школы:');
    expect(message).not.toContain('Вехи мастерства:');
    expect(message).toContain('💡 След:');
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

    expect(message).toContain('🧰 Навыки');
    expect(message).toContain('Свежевание: Знаток свежевания · ранг удержан');
    expect(message).toContain('Извлечение эссенции: Ученик извлечения эссенции · рука привыкает');
    expect(message).not.toContain('ранг 1 · 100 опыта');
    expect(message).not.toContain('ранг 0 · 1/100');
  });

  it('keeps detailed school mastery milestones in the mastery screen', () => {
    const player = createPlayer({
      tutorialState: 'SKIPPED',
      schoolMasteries: [{ schoolCode: 'ember', experience: 3, rank: 1 }],
      runes: [createEquippedRune()],
    });
    const profile = renderProfile(player);
    const mastery = renderSchoolMastery(player);

    expect(profile).not.toContain('Вехи мастерства: Пламя');
    expect(mastery).toContain('📜 Мастерство');
    expect(mastery).toContain('🔥 Пламя · в фокусе · ранг 1 · 3 XP');
    expect(mastery).toContain('✓ 1/1 · Первый жар');
    expect(mastery).toContain('✓ 3/3 · Разогрев дожима');
    expect(mastery).toContain('→ 3/5 · Связка давления');
    expect(mastery).toContain('· 3/7 · Печать давления');
    expect(mastery).toContain('Твердь · закрыта');
  });

  it('keeps profile focused on the character sheet while mastery has its own screen', () => {
    const message = renderProfile(createPlayer({
      tutorialState: 'SKIPPED',
      schoolMasteries: [{ schoolCode: 'ember', experience: 3, rank: 1 }],
      runes: [createEquippedRune()],
    }));

    expect(message).toContain('📜 Школы: в «Мастерстве»');
    expect(message).not.toContain('✓ 1/1 · Первый жар');
    expect(message).not.toContain('Следующая веха:');
  });

  it('keeps the profile explicit when action-based skills are still empty', () => {
    const message = renderProfile(createPlayer());

    expect(message).toContain('🧰 Навыки: пока пусто');
  });

  it('renders the workshop as a compact action dashboard', () => {
    const player = createPlayer({
      inventory: {
        ...createPlayer().inventory,
        leather: 4,
        bone: 2,
        metal: 1,
        healingPills: 1,
      },
    });
    const message = renderWorkshop({
      player,
      blueprints: [
        {
          blueprint: getWorkshopBlueprint('hunter_cleaver'),
          ownedQuantity: 1,
          canCraft: true,
          missingCost: {},
        },
        {
          blueprint: getWorkshopBlueprint('tracker_jacket'),
          ownedQuantity: 1,
          canCraft: false,
          missingCost: { leather: 1 },
        },
        {
          blueprint: getWorkshopBlueprint('skinning_kit'),
          ownedQuantity: 0,
          canCraft: false,
          missingCost: { leather: 2, bone: 2 },
        },
      ],
      repairTools: [],
      craftedItems: [
        {
          item: {
            id: 'crafted-weapon-1',
            playerId: 1,
            itemCode: 'hunter_cleaver',
            itemClass: 'L',
            slot: 'weapon',
            status: 'ACTIVE',
            equipped: false,
            durability: 14,
            maxDurability: 14,
            createdAt: '2026-04-12T00:00:00.000Z',
            updatedAt: '2026-04-12T00:00:00.000Z',
          },
          equippable: true,
          repairable: false,
          availableRepairTools: [],
        },
      ],
    });

    expect(message).toContain('📌 Сейчас');
    expect(message).toContain('• ⚒ Создать: Охотничий тесак.');
    expect(message).toContain('• 🎽 Надеть: Охотничий тесак.');
    expect(message).toContain('• 🧪 Сварить: восстановления, стойкости.');
    expect(message).toContain('• 💊 Выпить: восстановления x1.');
    expect(message).toContain('• ✅ готово · Охотничий тесак');
    expect(message).toContain('• 🧩 не хватает: кожа 1 · Куртка следопыта');
    expect(message).toContain('• 🔒 нужен чертеж · Набор свежевателя');
    expect(message).toContain('🎽 Снаряжение');
    expect(message).toContain('можно надеть');
    expect(message).toContain('❤️ Пилюля восстановления x1: +6 HP.');
    expect(message).not.toContain('Закрывает раны');
  });

  it('keeps active tutorial recap focused on the first training battle', () => {
    const message = renderReturnRecap(createPlayer({ tutorialState: 'ACTIVE', locationLevel: 0 }));

    expect(message).toContain('до первой руны один шаг');
    expect(message).toContain('💡 Дальше: «⚔️ Учебный бой».');
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

  it('adds a school-specific next goal after victory with a rune drop', () => {
    const message = renderBattle(createBattle({
      rewards: {
        ...createBattle().rewards!,
        droppedRune: createDroppedRune(),
      },
    }));

    expect(message).toContain('💡 След: откройте «🔮 Руны» и наденьте новую руну.');
    expect(message).toContain('💡 Дальше: «🔮 Руны».');
    expect(message).not.toContain('\n🎯 След:');
  });

  it('adds a forward-looking next goal after victory without a rune drop', () => {
    const message = renderBattle(createBattle(), createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRareRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('💡 След: проверьте печать школы Пламени на цели печати');
    expect(message).toContain('💡 Дальше: «⚔️ Цель печати».');
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
    expect(message).toContain('💡 След: проверьте «🔮 Руны», затем вернитесь через осторожную встречу.');
    expect(message).toContain('💡 Дальше: «🔮 Руны».');
  });

  it('shows the nearest school milestone in the main menu once mastery progress exists', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRareRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('⭐ Печать Пламени: Вы уже пережили большой бой Пламени');
    expect(message).toContain('💡 След: проверьте печать школы Пламени на цели печати');
    expect(message).toContain('💡 Сделать шаг: «⚔️ Цель печати».');
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
    expect(message).toContain('💡 След: откройте «🔮 Руны» и наденьте первый знак школы Пламени.');
    expect(message).toContain('💡 Сделать шаг: «🔮 Руны».');
  });

  it('keeps the school sign visible when the rune hub is opened from the payoff handoff', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      currentRuneIndex: 0,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune(), createUnusualReserveRune()],
    }));

    expect(message).toContain('🎯 откройте «🔮 Руны» и наденьте первый знак школы Пламени.');
    expect(message).toContain('👁️ Фокус: «Необычная руна Пламени».');
  });

  it('keeps the mastery milestone branch out of the rune hub', () => {
    const message = renderRuneScreen(createPlayer({
      tutorialState: 'SKIPPED',
      schoolMasteries: [{ schoolCode: 'ember', experience: 0, rank: 0 }],
      runes: [createEquippedRune()],
    }));

    expect(message).not.toContain('Вехи мастерства:');
    expect(message).not.toContain('→ 0/1 · Первый жар');
    expect(message).not.toContain('Следующая веха:');
  });

  it('keeps the first-sign follow-up under the normal explore CTA', () => {
    const player = createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedUnusualRune()],
    });

    expect(renderReturnRecap(player)).toContain('💡 Дальше: «⚔️ Исследовать».');
    expect(renderMainMenu(player)).toContain('💡 Сделать шаг: «⚔️ Исследовать».');
    expect(renderRuneScreen(player)).not.toContain('Проверить школу');
    expect(renderBattle(createBattle(), player)).toContain('💡 Дальше: «⚔️ Исследовать».');
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
    expect(message).toContain('💡 След: откройте «🔮 Руны» и наденьте печать школы Пламени.');
    expect(message).toContain('💡 Сделать шаг: «🔮 Руны».');
  });

  it('shows the school miniboss milestone once the first sign is already equipped', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 4,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedUnusualRune()],
    }));

    expect(message).toContain('💡 След: разыщите Пепельную матрону');
    expect(message).toContain('💡 Сделать шаг: «⚔️ Исследовать».');
  });

  it('shows a school novice path milestone before the first unusual school rune is earned', () => {
    const message = renderMainMenu(createPlayer({
      tutorialState: 'SKIPPED',
      victories: 3,
      schoolMasteries: [{ schoolCode: 'ember', experience: 1, rank: 0 }],
      runes: [createEquippedRune()],
    }));

    expect(message).toContain('💡 След: разыщите Пепельную ведунью');
    expect(message).toContain('💡 Сделать шаг: «⚔️ Исследовать».');
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

    expect(message).toContain('💡 След: разыщите Слепого авгура');
    expect(message).toContain('💡 Сделать шаг: «⚔️ Исследовать».');
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

    expect(message).toContain('💡 След: разыщите Шквальную рысь');
    expect(message).toContain('💡 Сделать шаг: «⚔️ Исследовать».');
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

    expect(message).toContain('✨ Новая руна: Искра Бури.');
    expect(message).toContain('💡 Откройте «🔮 Руны» и примерьте её в сборке.');
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
    expect(message).toContain('💡 Выбор: тяжёлый удар лучше встретить защитой');
    expect(message).toContain('🌀 Слот 1: Импульс углей — недоступно: откат 1 ход; мана 4/4, стоимость 3');
    expect(message).toContain('🛡️ Защита (+4 щит)');
    expect(message).toContain('🌀 1: Импульс углей · КД 1 · 3 маны');
    expect(message).toContain('🔥 Пламя: враг уже просел');
  });

  it('renders party battles as a compact squad overview', () => {
    const allySnapshot = {
      ...createBattle().player,
      playerId: 2,
      name: 'Рунный мастер #1002',
    };
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      battleType: 'PARTY_PVE',
      party: {
        id: 'party-1',
        inviteCode: 'ABC123',
        leaderPlayerId: 1,
        currentTurnPlayerId: 1,
        enemyTargetPlayerId: null,
        actedPlayerIds: [],
        members: [
          { playerId: 1, vkId: 1001, name: createBattle().player.name, snapshot: createBattle().player },
          { playerId: 2, vkId: 1002, name: allySnapshot.name, snapshot: allySnapshot },
        ],
      },
    }), undefined, null, 1);

    expect(message).toContain('🌐 Локация: Порог Инициации [Отряд 2/2]');
    expect(message).toContain('👤 Вы: Рунный мастер #1001');
    expect(message).toContain('👤 Товарищ: Рунный мастер #1002');
    expect(message).toContain('Враг: Учебный огонёк');
    expect(message).not.toContain('Сейчас действует:');
  });

  it('shows a wait line instead of ally actions when it is not the viewer turn in a party battle', () => {
    const allySnapshot = {
      ...createBattle().player,
      playerId: 2,
      name: 'Рунный мастер #1002',
    };
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      battleType: 'PARTY_PVE',
      player: allySnapshot,
      party: {
        id: 'party-1',
        inviteCode: 'ABC123',
        leaderPlayerId: 1,
        currentTurnPlayerId: 2,
        enemyTargetPlayerId: null,
        actedPlayerIds: [1],
        members: [
          { playerId: 1, vkId: 1001, name: createBattle().player.name, snapshot: createBattle().player },
          { playerId: 2, vkId: 1002, name: allySnapshot.name, snapshot: allySnapshot },
        ],
      },
    }), undefined, null, 1);

    expect(message).toContain('🕒 Ход товарища: Рунный мастер #1002.');
    expect(message).not.toContain('⚔️ Ответ мастера:');
    expect(message).not.toContain('🔮 Руна молчит');
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

  it('shows encounter variety copy when the route changes the battle setup', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      encounter: {
        status: 'OFFERED',
        initialTurnOwner: 'ENEMY',
        canFlee: true,
        fleeChancePercent: 42,
        kind: 'AMBUSH',
        title: 'Засада',
        description: 'Учебный огонёк выходит из укрытия ближе обычного.',
        effectLine: 'Враг начнёт первым, шанс отступить ниже: -10%.',
      },
    }));

    expect(message).toContain('👁️ Засада: Учебный огонёк выходит из укрытия ближе обычного.');
    expect(message).toContain('🧭 Условие встречи: Враг начнёт первым, шанс отступить ниже: -10%.');
    expect(message).toContain('Тропа назад: 42%');
  });

  it('shows the full battle log newest-first while it remains short enough to read', () => {
    const message = renderBattle(createBattle({
      status: 'ACTIVE',
      result: null,
      rewards: null,
      log: [
        '🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.',
        '🧭 Путевой эпизод: вы находите свежие следы.',
        '🌀 [Рунный мастер #1001] применяет «Импульс углей» против [Синий слизень]: 8 урона.',
        '⚠️ Синий слизень выдаёт приём против стойки. Точный жест ещё скрыт.',
        '💙 Рунный фокус: +1 маны.',
      ],
    }));

    expect(message).toContain('Летопись схватки');
    expect(message).toContain('• 🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.');
    expect(message).toContain('• 🧭 Путевой эпизод: вы находите свежие следы.');
    expect(message).toContain('• 🌀 [Рунный мастер #1001] применяет «Импульс углей» против [Синий слизень]: 8 урона.');
    expect(message).toContain('• ⚠️ Синий слизень выдаёт приём против стойки. Точный жест ещё скрыт.');
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
        '⚔️ [Рунный мастер #1001] наносит 4 урона [Синий слизень].',
        '⚠️ Синий слизень выдаёт приём против стойки. Точный жест ещё скрыт.',
        '💙 Рунный фокус: +1 маны.',
        '🌀 [Рунный мастер #1001] применяет «Импульс углей» против [Синий слизень]: 8 урона.',
        '🛡️ [Рунный мастер #1001] смягчает удар на 2 урона.',
        '👾 [Синий слизень] бьёт [Рунный мастер #1001] и наносит 1 урона.',
        '⚔️ [Рунный мастер #1001] наносит 5 урона [Синий слизень].',
        '🏆 Победа!',
      ],
    }));

    expect(message).toContain('• 🗺️ Тёмный лес: на вас выходит обычный враг Синий слизень.');
    expect(message).toContain('… ещё 2 события между нынешним мигом и началом схватки');
    expect(message).not.toContain('• 🧭 Путевой эпизод: вы находите свежие следы.');
    expect(message).not.toContain('• ⚔️ [Рунный мастер #1001] наносит 4 урона [Синий слизень].');
    expect(message).toContain('• ⚠️ Синий слизень выдаёт приём против стойки. Точный жест ещё скрыт.');
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
          title: 'Пробивающий удар',
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

    expect(message).toContain('💡 Выбор: пробивающий удар ломает стойку');
    expect(message).toContain('💡 🧠 Прорицание: «Пробивающий удар» уже прочитан');
  });

  it('shows school-specific guard value for stone stance in battle actions', () => {
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

    expect(message).toContain('✨ Открыт новый слот рун.');
    expect(message).toContain('💡 Откройте «🔮 Руны» и выберите, какой слот занять новой руной.');
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

    expect(message).toContain('✨ Испытание школы пройдено.');
    expect(message).toContain('💡 Откройте «🔮 Руны», наденьте первый знак школы');
  });

  it('renders a pending trophy card with meaningful action previews', () => {
    const message = renderPendingReward(createPendingReward());

    expect(message).toContain('🏁 Трофеи победы');
    expect(message).toContain('Лесной волк повержен');
    expect(message).toContain('🎁 Уже ваше: +14 опыта · +5 пыли · +2 обычных осколка.');
    expect(message).toContain('💡 Выберите действие с добычей.');
    expect(message).not.toContain('🧰 Выберите 1 действие:');
    expect(message).toContain('🔪 Свежевать — +2 кожи · +1 кость · Свежевание');
    expect(message).not.toContain('🎒 Забрать добычу');
  });

  it('renders the safe trophy preview when it is the only collection action', () => {
    const pendingReward = createPendingReward();
    const message = renderPendingReward({
      ...pendingReward,
      snapshot: {
        ...pendingReward.snapshot,
        trophyActions: pendingReward.snapshot.trophyActions.filter((action) => action.code === 'claim_all'),
      },
    });

    expect(message).toContain('🎒 Забрать добычу — +2 кожи · +1 кость · без роста навыка');
  });

  it('renders collected trophy results without repeating route guidance', () => {
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
    expect(message).toContain('🎒 +2 кожи · +1 кость.');
    expect(message).toContain('Свежевание: Ученик свежевания · движение стало вернее');
    expect(message).not.toContain('Свежевание: 3 → 4');
    expect(message).not.toContain('💡 След:');
    expect(message).not.toContain('💡 Дальше:');
  });

  it('keeps collected trophy school payoff separate from the next-goal handoff', () => {
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

    expect(message).toContain('🎒 +1 эссенция.');
    expect(message).not.toContain('💡 След: откройте «🔮 Руны»');
    expect(message).not.toContain('💡 Дальше: «🔮 Руны».');
  });
});
