export interface SkillUpChanceInput {
  readonly currentSkillPoints: number;
  readonly actionPoints: number;
}

const noSkillUpChancePercent = 0;
const minimumSkillUpChancePercent = 5;
const maximumSkillUpChancePercent = 95;
const baseSkillUpChancePercent = 90;
const actionPointChanceBonusPercent = 5;
const currentSkillPointPenaltyStep = 10;

const clampSkillUpChance = (chancePercent: number): number => (
  Math.max(minimumSkillUpChancePercent, Math.min(maximumSkillUpChancePercent, chancePercent))
);

const normalizePoints = (points: number): number => {
  if (!Number.isFinite(points)) {
    return 0;
  }

  return Math.max(0, Math.floor(points));
};

export const resolveSkillUpChancePercent = (input: SkillUpChanceInput): number => {
  const actionPoints = normalizePoints(input.actionPoints);
  if (actionPoints === 0) {
    return noSkillUpChancePercent;
  }

  const currentSkillPoints = normalizePoints(input.currentSkillPoints);
  const skillPenalty = Math.floor(currentSkillPoints / currentSkillPointPenaltyStep);
  const actionBonus = actionPoints * actionPointChanceBonusPercent;

  return clampSkillUpChance(baseSkillUpChancePercent + actionBonus - skillPenalty);
};
