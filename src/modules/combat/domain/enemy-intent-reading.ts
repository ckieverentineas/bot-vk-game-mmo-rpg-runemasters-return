import type {
  BattleEnemyIntentSnapshot,
  BattleEnemySnapshot,
  BattleRuneLoadoutSnapshot,
  BattleView,
} from '../../../shared/types/game';
import { listBattleRuneLoadouts, type BattleRuneSlotLoadout } from './battle-rune-loadouts';

export type EnemyIntentReadingPrecision = 'none' | 'warning' | 'pattern' | 'exact';
export type EnemyIntentReadingSource = 'none' | 'instinct' | 'battlefield_analysis' | 'trophy_study' | 'divination';

export interface EnemyIntentReading {
  readonly intent: BattleEnemyIntentSnapshot | null;
  readonly precision: EnemyIntentReadingPrecision;
  readonly source: EnemyIntentReadingSource;
  readonly mentalGuard: number;
  readonly readingPower: number;
}

const primaryDivinationPower = 10;
const supportDivinationPower = 6;
const masteryDivinationPower = 4;
const firstSignDivinationPower = 2;
const sealDivinationPower = 5;
const analysisVictoryPower = 2;
const trophyStudyPower = 2;

const resolveSchoolStagePower = (loadout: BattleRuneLoadoutSnapshot): number => {
  if (loadout.schoolProgressStage === 'SEAL') {
    return sealDivinationPower;
  }

  if (loadout.schoolProgressStage === 'FIRST_SIGN') {
    return firstSignDivinationPower;
  }

  return 0;
};

const resolveDivinationPower = (
  battle: BattleView,
  slotLoadout: BattleRuneSlotLoadout,
): number => {
  const basePower = slotLoadout.slot === 0 ? primaryDivinationPower : supportDivinationPower;
  const masteryPower = (slotLoadout.loadout.schoolMasteryRank ?? 0) * masteryDivinationPower;

  return battle.player.intelligence + basePower + masteryPower + resolveSchoolStagePower(slotLoadout.loadout);
};

const resolveBestDivinationPower = (battle: BattleView): number => (
  Math.max(
    0,
    ...listBattleRuneLoadouts(battle.player)
      .filter(({ loadout }) => loadout.schoolCode === 'echo')
      .map((slotLoadout) => resolveDivinationPower(battle, slotLoadout)),
  )
);

const resolveAnalysisPower = (battle: BattleView): number => {
  const knowledge = battle.enemy.knowledge;
  const victoryPower = Math.min(12, (knowledge?.victoryCount ?? 0) * analysisVictoryPower);
  const studiedPower = knowledge?.hasTrophyStudy ? trophyStudyPower : 0;

  return battle.player.intelligence + Math.floor(battle.player.dexterity / 2) + victoryPower + studiedPower;
};

export const resolveEnemyMentalGuard = (enemy: BattleEnemySnapshot): number => {
  const rankBonus = enemy.isBoss ? 6 : enemy.isElite ? 3 : 0;

  return Math.max(1, enemy.intelligence * 2 + enemy.magicDefence + rankBonus);
};

const isPatternRead = (power: number, mentalGuard: number): boolean => (
  power >= Math.ceil(mentalGuard * 0.75)
);

const createReading = (
  battle: BattleView,
  precision: EnemyIntentReadingPrecision,
  source: EnemyIntentReadingSource,
  readingPower: number,
): EnemyIntentReading => ({
  intent: battle.enemy.intent ?? null,
  precision,
  source,
  mentalGuard: resolveEnemyMentalGuard(battle.enemy),
  readingPower,
});

export const resolveEnemyIntentReading = (battle: BattleView): EnemyIntentReading => {
  if (!battle.enemy.intent) {
    return createReading(battle, 'none', 'none', 0);
  }

  const mentalGuard = resolveEnemyMentalGuard(battle.enemy);
  const divinationPower = resolveBestDivinationPower(battle);
  if (divinationPower > 0) {
    return createReading(
      battle,
      divinationPower >= mentalGuard ? 'exact' : isPatternRead(divinationPower, mentalGuard) ? 'pattern' : 'warning',
      'divination',
      divinationPower,
    );
  }

  const analysisPower = resolveAnalysisPower(battle);
  const knowledge = battle.enemy.knowledge;
  if ((knowledge?.victoryCount ?? 0) >= 5 && analysisPower >= mentalGuard) {
    return createReading(battle, 'exact', 'trophy_study', analysisPower);
  }

  if ((knowledge?.victoryCount ?? 0) > 0 || knowledge?.hasTrophyStudy) {
    return createReading(
      battle,
      isPatternRead(analysisPower, mentalGuard) ? 'pattern' : 'warning',
      'trophy_study',
      analysisPower,
    );
  }

  if (isPatternRead(analysisPower, mentalGuard)) {
    return createReading(battle, 'pattern', 'battlefield_analysis', analysisPower);
  }

  return createReading(battle, 'warning', 'instinct', analysisPower);
};

export const isEnemyIntentReadable = (reading: EnemyIntentReading): boolean => (
  reading.precision === 'pattern' || reading.precision === 'exact'
);

export const getReadableEnemyIntent = (battle: BattleView): BattleEnemyIntentSnapshot | null => {
  const reading = resolveEnemyIntentReading(battle);
  return isEnemyIntentReadable(reading) ? reading.intent : null;
};

export const getExactlyReadEnemyIntent = (battle: BattleView): BattleEnemyIntentSnapshot | null => {
  const reading = resolveEnemyIntentReading(battle);
  return reading.precision === 'exact' ? reading.intent : null;
};
