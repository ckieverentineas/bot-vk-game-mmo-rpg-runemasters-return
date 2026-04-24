import type { BattleView } from '../../../../shared/types/game';
import {
  type EnemyIntentReading,
  isEnemyIntentReadable,
  resolveEnemyIntentReading,
} from '../../domain/enemy-intent-reading';
import { listBattleRuneLoadouts } from '../../domain/battle-rune-loadouts';
import { buildBattleRuneActionReadinessView } from './battle-rune-action-readiness';

export interface BattleClarityView {
  readonly stateLine: string;
  readonly choiceLine: string | null;
  readonly schoolHintLine: string | null;
  readonly enemyIntentReading: EnemyIntentReading;
}

const buildGuardLine = (battle: BattleView): string => (
  (battle.player.guardPoints ?? 0) > 0 ? ` · щит ${battle.player.guardPoints}` : ''
);

const resolveEnemyRiskLabel = (battle: BattleView, reading: EnemyIntentReading): string => {
  if (!battle.enemy.intent) {
    return 'следующий ход врага пока без явной угрозы';
  }

  if (reading.precision === 'warning') {
    return 'замысел врага не прочитан';
  }

  if (battle.enemy.intent.code === 'HEAVY_STRIKE') {
    return 'враг готовит тяжёлый удар';
  }

  if (battle.enemy.intent.code === 'GUARD_BREAK') {
    return 'враг готовит пробивающий удар';
  }

  return 'враг готовит опасный ход';
};

const hasReadyRuneAction = (battle: BattleView): boolean => (
  listBattleRuneLoadouts(battle.player).some(({ loadout }) => {
    const activeAbility = loadout.activeAbility;
    return !!activeAbility
      && buildBattleRuneActionReadinessView(battle, activeAbility).isReady;
  })
);

const hasReadyRuneActionCode = (battle: BattleView, code: string): boolean => (
  listBattleRuneLoadouts(battle.player).some(({ loadout }) => (
    loadout.activeAbility?.code === code
    && buildBattleRuneActionReadinessView(battle, loadout.activeAbility).isReady
  ))
);

const hasEquippedSchoolSeal = (battle: BattleView, schoolCode: string): boolean => (
  listBattleRuneLoadouts(battle.player).some(({ loadout }) => (
    loadout.schoolCode === schoolCode && loadout.schoolProgressStage === 'SEAL'
  ))
);

const hasReadableIntentCode = (
  battle: BattleView,
  reading: EnemyIntentReading,
  code: NonNullable<BattleView['enemy']['intent']>['code'],
): boolean => isEnemyIntentReadable(reading) && battle.enemy.intent?.code === code;

const resolveChoiceLine = (battle: BattleView, reading: EnemyIntentReading): string | null => {
  const readyRuneAction = hasReadyRuneAction(battle);

  if (!battle.enemy.intent) {
    return null;
  }

  if (!isEnemyIntentReadable(reading)) {
    return readyRuneAction
      ? '🎲 Выбор: виден опасный замысел; держите запас HP и отвечайте готовой руной, если нужен надёжный ход.'
      : '🎲 Выбор: виден опасный замысел; не отдавайте ход вслепую, если HP уже просело.';
  }

  if (battle.enemy.intent.code === 'HEAVY_STRIKE') {
    return readyRuneAction
      ? '🎲 Выбор: тяжёлый удар лучше встретить защитой; готовая руна тоже получает хороший миг для ответа.'
      : '🎲 Выбор: тяжёлый удар лучше встретить защитой; голая атака рискованнее.';
  }

  if (battle.enemy.intent.code === 'GUARD_BREAK') {
    return readyRuneAction
      ? '🎲 Выбор: пробивающий удар ломает стойку — отвечайте атакой или готовой руной, чистую защиту оставьте на другой ход.'
      : '🎲 Выбор: пробивающий удар ломает стойку — отвечайте атакой, чистая защита рискованна.';
  }

  return null;
};

const resolveSchoolHint = (battle: BattleView, reading: EnemyIntentReading): string | null => {
  const firstSchoolSignEquipped = battle.player.runeLoadout?.schoolProgressStage === 'FIRST_SIGN';

  switch (battle.player.runeLoadout?.schoolCode) {
    case 'ember': {
      const threshold = Math.ceil(battle.enemy.maxHealth / 2);
      if (hasEquippedSchoolSeal(battle, 'ember')) {
        return battle.enemy.currentHealth <= threshold
          ? '🔥 Печать Пламени: цель уже просела — давление печати помогает дожать без лишнего ожидания.'
          : '🔥 Печать Пламени: держите базовое давление; следующий горизонт — проверять печать на сильных целях.';
      }

      if (hasReadableIntentCode(battle, reading, 'GUARD_BREAK')) {
        return firstSchoolSignEquipped
          ? '🔥 Первый знак Пламени: пробивающий удар открывает окно давления; отвечайте атакой или «Импульсом углей», пока враг раскрыт.'
          : '🔥 Пламя: пробивающий удар открывает окно давления; атака и готовая техника не дают врагу спокойно сломать стойку.';
      }

      if (firstSchoolSignEquipped) {
        return battle.enemy.currentHealth <= threshold
          ? '🔥 Первый знак Пламени: враг уже просел — дожмите его сейчас, чтобы сразу почувствовать стиль школы.'
          : '🔥 Первый знак Пламени: держите давление базовой атакой или техникой, пока цель не войдёт в окно дожима.';
      }

      return battle.enemy.currentHealth <= threshold
        ? '🔥 Пламя: враг уже просел — сейчас особенно ценно дожимать и не отдавать темп.'
        : '🔥 Пламя: держите давление и ищите окно, где бой можно быстро переломить в дожим.';
    }
    case 'stone':
      if (hasEquippedSchoolSeal(battle, 'stone') && hasReadableIntentCode(battle, reading, 'HEAVY_STRIKE')) {
        return '🪨 Печать Тверди: тяжёлый удар стал целью печати — держите стойку и превращайте угрозу в опору.';
      }

      if (hasEquippedSchoolSeal(battle, 'stone')) {
        return '🪨 Печать Тверди: защита получает устойчивую опору; следующий горизонт — искать цели, которые проверяют выдержку.';
      }

      if (firstSchoolSignEquipped && hasReadableIntentCode(battle, reading, 'HEAVY_STRIKE')) {
        return '🪨 Первый знак Тверди: держите тяжёлый удар защитой или «Каменным отпором», а затем отвечайте сильнее обычного.';
      }

      if (firstSchoolSignEquipped && hasReadableIntentCode(battle, reading, 'GUARD_BREAK')) {
        return '🪨 Первый знак Тверди: пробивающий удар наказывает слепую стойку; добавьте ответный ход, а не только защиту.';
      }

      if (firstSchoolSignEquipped) {
        return '🪨 Первый знак Тверди: школа уже в руках; переживите опасный ход и отвечайте сильнее, чем обычная руна.';
      }

      if (hasReadableIntentCode(battle, reading, 'HEAVY_STRIKE')) {
        return '🪨 Твердь: тяжёлый удар лучше держать защитой или «Каменным отпором», а затем наказать в окно ответа.';
      }

      if (hasReadableIntentCode(battle, reading, 'GUARD_BREAK')) {
        return '🪨 Твердь: пробивающий удар ломает чистую стойку; не ставьте весь ход только на защиту без ответа.';
      }

      return '🪨 Твердь: ценность школы в том, чтобы пережить опасный ход и ответить сильнее обычного.';
    case 'gale': {
      const activeAbility = battle.player.runeLoadout?.activeAbility;
      if (hasEquippedSchoolSeal(battle, 'gale') && hasReadyRuneActionCode(battle, 'gale_step')) {
        return '🌪️ Печать Бури: «Шаг шквала» теперь лучше удерживает темп; ищите цель, где рывок готовит следующий ответ.';
      }

      if (isEnemyIntentReadable(reading) && battle.enemy.intent && hasReadyRuneActionCode(battle, 'gale_step')) {
        return firstSchoolSignEquipped
          ? '🌪️ Первый знак Бури: раскрытая угроза даёт окно темпа; «Шаг шквала» бьёт и лучше прикрывает следующий ответ.'
          : '🌪️ Буря: раскрытая угроза даёт окно темпа; «Шаг шквала» бьёт и лучше прикрывает следующий ответ.';
      }

      if (firstSchoolSignEquipped && activeAbility && activeAbility.currentCooldown <= 0 && battle.player.currentMana >= activeAbility.manaCost) {
        return '🌪️ Первый знак Бури: ударьте «Шагом шквала», чтобы сразу нанести урон и подготовить защиту на ответ врага.';
      }

      if (firstSchoolSignEquipped) {
        return '🌪️ Первый знак Бури: держите темп — ваш лучший ход должен и бить, и готовить следующий ответ.';
      }

      if (activeAbility && activeAbility.currentCooldown <= 0 && battle.player.currentMana >= activeAbility.manaCost) {
        return '🌪️ Буря: «Шаг шквала» позволяет ударить и сразу подготовить защиту на следующий ответ врага.';
      }

      return '🌪️ Буря: играйте от темпа — ваш ход должен не только бить, но и готовить следующий ответ.';
    }
    case 'echo':
      if (hasEquippedSchoolSeal(battle, 'echo')) {
        return reading.precision === 'exact' && battle.enemy.intent
          ? `🧠 Печать Прорицания: «${battle.enemy.intent.title}» уже прочитан — печать усиливает точный ответ.`
          : battle.enemy.intent
          ? '🧠 Печать Прорицания: ментальная защита мешает точному чтению; добейте путь мастерством или опытом.'
          : '🧠 Печать Прорицания: ищите цель с раскрытой угрозой; там печать даст следующий слой чтения боя.';
      }

      if (firstSchoolSignEquipped) {
        return reading.precision === 'exact' && battle.enemy.intent
          ? `🧠 Первый знак Прорицания: «${battle.enemy.intent.title}» уже прочитан — отвечайте точно, не тратьте ход вслепую.`
          : battle.enemy.intent
          ? '🧠 Первый знак Прорицания: угроза видна, но точный ход закрыт ментальной защитой врага.'
          : '🧠 Первый знак Прорицания: ждите раскрытую угрозу и отвечайте в правильный момент, чтобы почувствовать школу.';
      }

      return reading.precision === 'exact' && battle.enemy.intent
        ? `🧠 Прорицание: «${battle.enemy.intent.title}» уже прочитан — это лучшее окно для точного ответа.`
        : battle.enemy.intent
        ? '🧠 Прорицание: угроза чувствуется, но точный ход пока скрыт — рост пути пробьёт сильную менталку.'
        : '🧠 Прорицание: ждите раскрытую угрозу и наказывайте врага в правильный момент, а не наугад.';
    default:
      return null;
  }
};

export const buildBattleClarityView = (battle: BattleView): BattleClarityView => {
  const enemyIntentReading = resolveEnemyIntentReading(battle);

  return {
    stateLine: `📌 Сейчас: вы ${battle.player.currentHealth}/${battle.player.maxHealth} HP · ${battle.player.currentMana}/${battle.player.maxMana} маны${buildGuardLine(battle)} | враг ${battle.enemy.currentHealth}/${battle.enemy.maxHealth} HP · ${resolveEnemyRiskLabel(battle, enemyIntentReading)}.`,
    choiceLine: resolveChoiceLine(battle, enemyIntentReading),
    schoolHintLine: resolveSchoolHint(battle, enemyIntentReading),
    enemyIntentReading,
  };
};
