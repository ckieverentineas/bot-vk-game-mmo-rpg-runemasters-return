import type { BattleView } from '../../../../shared/types/game';
import { listBattleRuneLoadouts } from '../../domain/battle-rune-loadouts';
import { buildBattleRuneActionReadinessView } from './battle-rune-action-readiness';

export interface BattleClarityView {
  readonly stateLine: string;
  readonly choiceLine: string | null;
  readonly schoolHintLine: string | null;
}

const buildGuardLine = (battle: BattleView): string => (
  (battle.player.guardPoints ?? 0) > 0 ? ` · guard ${battle.player.guardPoints}` : ''
);

const resolveEnemyRiskLabel = (battle: BattleView): string => {
  if (battle.enemy.intent?.code === 'HEAVY_STRIKE') {
    return 'враг готовит тяжёлый удар';
  }

  if (battle.enemy.intent?.code === 'GUARD_BREAK') {
    return 'враг готовит guard-break';
  }

  return 'следующий ход врага пока без особого телеграфа';
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

const resolveChoiceLine = (battle: BattleView): string | null => {
  const readyRuneAction = hasReadyRuneAction(battle);

  if (battle.enemy.intent?.code === 'HEAVY_STRIKE') {
    return readyRuneAction
      ? '🎲 Выбор: тяжёлый удар лучше встретить защитой; готовая руна тоже получает окно по раскрытому замыслу.'
      : '🎲 Выбор: тяжёлый удар лучше встретить защитой; голая атака рискованнее.';
  }

  if (battle.enemy.intent?.code === 'GUARD_BREAK') {
    return readyRuneAction
      ? '🎲 Выбор: пробивающий удар ломает стойку — отвечайте атакой или готовой руной, чистую защиту оставьте на другой ход.'
      : '🎲 Выбор: пробивающий удар ломает стойку — отвечайте атакой, чистая защита рискованна.';
  }

  return null;
};

const resolveSchoolHint = (battle: BattleView): string | null => {
  const firstSchoolSignEquipped = battle.player.runeLoadout?.schoolProgressStage === 'FIRST_SIGN';

  switch (battle.player.runeLoadout?.schoolCode) {
    case 'ember': {
      const threshold = Math.ceil(battle.enemy.maxHealth / 2);
      if (battle.enemy.intent?.code === 'GUARD_BREAK') {
        return firstSchoolSignEquipped
          ? '🔥 Первый знак Пламени: guard-break — ваше окно давления; отвечайте атакой или «Импульсом углей», пока враг раскрыт.'
          : '🔥 Пламя: guard-break — окно давления; атака и готовая техника не дают врагу спокойно сломать стойку.';
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
      if (firstSchoolSignEquipped && battle.enemy.intent?.code === 'HEAVY_STRIKE') {
        return '🪨 Первый знак Тверди: держите тяжёлый удар защитой или «Каменным отпором», а затем отвечайте сильнее обычного.';
      }

      if (firstSchoolSignEquipped && battle.enemy.intent?.code === 'GUARD_BREAK') {
        return '🪨 Первый знак Тверди: guard-break наказывает слепую стойку — добавьте ответный ход, а не только защиту.';
      }

      if (firstSchoolSignEquipped) {
        return '🪨 Первый знак Тверди: школа уже в сборке — переживите опасный ход и отвечайте сильнее, чем обычная руна.';
      }

      if (battle.enemy.intent?.code === 'HEAVY_STRIKE') {
        return '🪨 Твердь: тяжёлый удар лучше держать защитой или «Каменным отпором», а затем наказать в окно ответа.';
      }

      if (battle.enemy.intent?.code === 'GUARD_BREAK') {
        return '🪨 Твердь: guard-break ломает чистую стойку — не ставьте весь ход только на защиту без ответа.';
      }

      return '🪨 Твердь: ценность школы в том, чтобы пережить опасный ход и ответить сильнее, чем обычная сборка.';
    case 'gale': {
      const activeAbility = battle.player.runeLoadout?.activeAbility;
      if (battle.enemy.intent && hasReadyRuneActionCode(battle, 'gale_step')) {
        return firstSchoolSignEquipped
          ? '🌪️ Первый знак Бури: раскрытый замысел — окно темпа; «Шаг шквала» бьёт и лучше прикрывает следующий ответ.'
          : '🌪️ Буря: раскрытый замысел — окно темпа; «Шаг шквала» бьёт и лучше прикрывает следующий ответ.';
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
      if (firstSchoolSignEquipped) {
        return battle.enemy.intent
          ? `🧠 Первый знак Прорицания: «${battle.enemy.intent.title}» уже прочитан — отвечайте точно, не тратьте ход вслепую.`
          : '🧠 Первый знак Прорицания: ждите раскрытую угрозу и отвечайте в правильный момент, чтобы почувствовать школу.';
      }

      return battle.enemy.intent
        ? `🧠 Прорицание: «${battle.enemy.intent.title}» уже прочитан — это лучшее окно для точного ответа.`
        : '🧠 Прорицание: ждите раскрытую угрозу и наказывайте врага в правильный момент, а не наугад.';
    default:
      return null;
  }
};

export const buildBattleClarityView = (battle: BattleView): BattleClarityView => ({
  stateLine: `📌 Сейчас: вы ${battle.player.currentHealth}/${battle.player.maxHealth} HP · ${battle.player.currentMana}/${battle.player.maxMana} маны${buildGuardLine(battle)} | враг ${battle.enemy.currentHealth}/${battle.enemy.maxHealth} HP · ${resolveEnemyRiskLabel(battle)}.`,
  choiceLine: resolveChoiceLine(battle),
  schoolHintLine: resolveSchoolHint(battle),
});
