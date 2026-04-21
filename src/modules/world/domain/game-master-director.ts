import type { BattleEnemySnapshot, BiomeView } from '../../../shared/types/game';

export interface GameMasterEncounterContext {
  readonly biome: BiomeView;
  readonly enemy: BattleEnemySnapshot;
  readonly currentSchoolCode: string | null;
  readonly locationLevel: number;
}

const gameMasterTitleBySchoolCode: Readonly<Record<string, string>> = {
  ember: 'Мастер Пламени',
  stone: 'Мастер Тверди',
  gale: 'Мастер Бури',
  echo: 'Мастер Прорицания',
};

const schoolTrialLineBySchoolCode: Readonly<Record<string, string>> = {
  ember: 'просит сыграть от давления: атакуйте, ловите окно добивания и не отдавайте темп врагу.',
  stone: 'просит сыграть от выдержки: переживите опасный ход и превратите защиту в ответ.',
  gale: 'просит сыграть от темпа: бейте так, чтобы следующий ход уже был подготовлен.',
  echo: 'просит сыграть от чтения: дождитесь раскрытой угрозы и отвечайте в правильное окно.',
};

const isSchoolTrialEnemy = (enemy: BattleEnemySnapshot): boolean => (
  enemy.isElite || enemy.isBoss
);

const resolveSchoolTrialLine = (context: GameMasterEncounterContext): string | null => {
  if (!context.currentSchoolCode || !isSchoolTrialEnemy(context.enemy)) {
    return null;
  }

  const masterTitle = gameMasterTitleBySchoolCode[context.currentSchoolCode];
  const trialLine = schoolTrialLineBySchoolCode[context.currentSchoolCode];
  if (!masterTitle || !trialLine) {
    return null;
  }

  return `🎲 ${masterTitle} отмечает испытание: ${trialLine}`;
};

const resolveBossLine = (enemy: BattleEnemySnapshot): string | null => {
  if (!enemy.isBoss) {
    return null;
  }

  return '🎲 Совет мастеров помечает бой как проверку сборки: здесь важны ротация, защита и выбор момента, а не одна сильная кнопка.';
};

const resolveEliteLine = (enemy: BattleEnemySnapshot): string | null => {
  if (!enemy.isElite) {
    return null;
  }

  return '🎲 Мастер испытаний усиливает сцену: этот враг проверяет чтение намерений и аккуратный ответ под угрозой.';
};

const resolveTutorialLine = (context: GameMasterEncounterContext): string | null => {
  if (context.locationLevel !== 0 || context.biome.code !== 'initium') {
    return null;
  }

  return '🎲 Наставник Совета рун держит учебный бой честным: пробуйте базовую атаку и смотрите, как враг отвечает.';
};

export const resolveGameMasterEncounterLine = (context: GameMasterEncounterContext): string | null => (
  resolveTutorialLine(context)
  ?? resolveSchoolTrialLine(context)
  ?? resolveBossLine(context.enemy)
  ?? resolveEliteLine(context.enemy)
);
