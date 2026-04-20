import type { BattleView } from '../../../../shared/types/game';

export interface BattleClarityView {
  readonly stateLine: string;
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

const resolveSchoolHint = (battle: BattleView): string | null => {
  switch (battle.player.runeLoadout?.schoolCode) {
    case 'ember': {
      const threshold = Math.ceil(battle.enemy.maxHealth / 2);
      return battle.enemy.currentHealth <= threshold
        ? '🔥 Пламя: враг уже просел — сейчас особенно ценно дожимать и не отдавать темп.'
        : '🔥 Пламя: держите давление и ищите окно, где бой можно быстро переломить в дожим.';
    }
    case 'stone':
      if (battle.enemy.intent?.code === 'HEAVY_STRIKE') {
        return '🪨 Твердь: тяжёлый удар лучше пережить защитой или «Каменным отпором», а затем наказать в окно ответа.';
      }

      if (battle.enemy.intent?.code === 'GUARD_BREAK') {
        return '🪨 Твердь: guard-break ломает чистую стойку — не ставьте весь ход только на защиту без ответа.';
      }

      return '🪨 Твердь: ценность школы в том, чтобы пережить опасный ход и ответить сильнее, чем обычная сборка.';
    case 'gale': {
      const activeAbility = battle.player.runeLoadout?.activeAbility;
      if (activeAbility && activeAbility.currentCooldown <= 0 && battle.player.currentMana >= activeAbility.manaCost) {
        return '🌪️ Буря: «Шаг шквала» позволяет ударить и сразу подготовить защиту на следующий ответ врага.';
      }

      return '🌪️ Буря: играйте от темпа — ваш ход должен не только бить, но и готовить следующий ответ.';
    }
    case 'echo':
      return battle.enemy.intent
        ? '🧠 Прорицание: раскрытая угроза даёт лучшее окно для точного ответа — не тратьте ход вслепую.'
        : '🧠 Прорицание: ждите раскрытую угрозу и наказывайте врага в правильный момент, а не наугад.';
    default:
      return null;
  }
};

export const buildBattleClarityView = (battle: BattleView): BattleClarityView => ({
  stateLine: `📌 Сейчас: вы ${battle.player.currentHealth}/${battle.player.maxHealth} HP · ${battle.player.currentMana}/${battle.player.maxMana} маны${buildGuardLine(battle)} | враг ${battle.enemy.currentHealth}/${battle.enemy.maxHealth} HP · ${resolveEnemyRiskLabel(battle)}.`,
  schoolHintLine: resolveSchoolHint(battle),
});
