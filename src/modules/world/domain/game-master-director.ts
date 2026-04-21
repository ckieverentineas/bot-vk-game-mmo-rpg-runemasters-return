import type { BattleEnemySnapshot, BiomeView } from '../../../shared/types/game';
import type { ExplorationSceneKind } from './exploration-events';

export interface GameMasterEncounterContext {
  readonly biome: BiomeView;
  readonly enemy: BattleEnemySnapshot;
  readonly currentSchoolCode: string | null;
  readonly locationLevel: number;
}

export interface GameMasterExplorationSceneContext {
  readonly biome: BiomeView;
  readonly sceneKind: ExplorationSceneKind;
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

const schoolExplorationLineBySchoolCode: Readonly<Record<string, string>> = {
  ember: 'след снова говорит о давлении: следующий бой лучше читать через окно добивания, а не через ожидание идеального момента.',
  stone: 'след снова говорит о выдержке: следующая угроза спросит, где держать стойку, а где отвечать после защиты.',
  gale: 'след снова говорит о темпе: следующий ответ должен готовить ход вперёд, а не просто закрывать текущий удар.',
  echo: 'след снова говорит о чтении: следующая опасность станет понятнее, если сперва увидеть намерение врага.',
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

const resolveSchoolExplorationSceneLine = (context: GameMasterExplorationSceneContext): string | null => {
  if (context.sceneKind !== 'school_clue' || !context.currentSchoolCode) {
    return null;
  }

  const masterTitle = gameMasterTitleBySchoolCode[context.currentSchoolCode];
  const schoolLine = schoolExplorationLineBySchoolCode[context.currentSchoolCode];
  if (!masterTitle || !schoolLine) {
    return null;
  }

  return `🎲 ${masterTitle} связывает находку со школой: ${schoolLine}`;
};

const resolveNeutralExplorationSceneLine = (context: GameMasterExplorationSceneContext): string | null => {
  if (context.biome.code === 'initium') {
    return null;
  }

  switch (context.sceneKind) {
    case 'rest':
      return '🎲 Наставник Совета рун отмечает передышку: пауза помогает прочитать маршрут, но не меняет правила и темп приключения.';
    case 'resource_find':
      return '🎲 Мастер снабжения отмечает находку: малый материал полезен мастерской, но не заменяет рост через бои, руны и школы.';
    case 'danger_sign':
      return '🎲 Мастер испытаний отмечает опасный знак: это предупреждение о будущей угрозе, а не внезапный штраф.';
    case 'trial_master':
      return '🎲 Мастер испытаний оставляет рамку сцены: вопрос понятен, а ответ по-прежнему выбирает игрок.';
    case 'school_clue':
      return '🎲 Мастер испытаний отмечает школьный след: сцена помогает понять стиль, но не выдаёт силу за посещение.';
    default:
      return null;
  }
};

export const resolveGameMasterExplorationSceneLine = (context: GameMasterExplorationSceneContext): string | null => (
  resolveSchoolExplorationSceneLine(context)
  ?? resolveNeutralExplorationSceneLine(context)
);
