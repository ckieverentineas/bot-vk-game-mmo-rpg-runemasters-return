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
  ember: 'пепел ложится по ветру: в следующей стычке ищите миг, когда враг уже просел.',
  stone: 'камень держит старый удар: следующая угроза спросит, где стоять, а где отвечать.',
  gale: 'ветер забегает вперёд: следующий ход должен оставить вам ответ после удара.',
  echo: 'следы складываются в знак: сперва увидьте угрозу, потом бейте точно.',
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

  return '🎲 Совет мастеров отмечает большой бой: здесь важны выдержка, верный миг удара и собранная руна.';
};

const resolveEliteLine = (enemy: BattleEnemySnapshot): string | null => {
  if (!enemy.isElite) {
    return null;
  }

  return '🎲 Мастер испытаний предупреждает: этот враг проверит, умеете ли вы читать угрозу и отвечать вовремя.';
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

  return `🎲 ${masterTitle} читает знак школы: ${schoolLine}`;
};

const resolveNeutralExplorationSceneLine = (context: GameMasterExplorationSceneContext): string | null => {
  if (context.biome.code === 'initium') {
    return null;
  }

  switch (context.sceneKind) {
    case 'rest':
      return '🎲 Наставник Совета рун кивает: передышка тоже часть пути.';
    case 'resource_find':
      return '🎲 Мастер снабжения кивает на находку: малый материал лучше забрать сразу, пока тропа спокойна.';
    case 'danger_sign':
      return '🎲 Мастер испытаний указывает на зарубки: дорога заранее показывает зубы будущей угрозы.';
    case 'trial_master':
      return '🎲 Мастер испытаний оставляет знак: местность уже задала свой вопрос.';
    case 'school_clue':
      return '🎲 Мастер испытаний отмечает школьный след: знак сам не сражается, но помогает понять путь.';
    default:
      return null;
  }
};

export const resolveGameMasterExplorationSceneLine = (context: GameMasterExplorationSceneContext): string | null => (
  resolveSchoolExplorationSceneLine(context)
  ?? resolveNeutralExplorationSceneLine(context)
);
