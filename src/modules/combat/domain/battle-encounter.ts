import type {
  BattleEncounterKind,
  BattleEncounterView,
  BattlePlayerSnapshot,
  BattleView,
  TurnOwner,
} from '../../../shared/types/game';

const minimumFleeChancePercent = 15;
const maximumFleeChancePercent = 85;
const baseFleeChancePercent = 45;
const dexterityFleeChanceStep = 7;
const eliteFleePenaltyPercent = 10;
const bossFleePenaltyPercent = 20;

const clampFleeChance = (chancePercent: number): number => (
  Math.max(minimumFleeChancePercent, Math.min(maximumFleeChancePercent, chancePercent))
);

const resolveEnemyRankFleePenalty = (enemy: Pick<BattleView['enemy'], 'isElite' | 'isBoss'>): number => {
  if (enemy.isBoss) {
    return bossFleePenaltyPercent;
  }

  if (enemy.isElite) {
    return eliteFleePenaltyPercent;
  }

  return 0;
};

export interface BattleEncounterVariant {
  readonly kind: BattleEncounterKind;
  readonly title: string;
  readonly description: string;
  readonly effectLine: string;
  readonly fleeChanceModifierPercent?: number;
  readonly initialTurnOwner?: TurnOwner;
}

const buildEncounterPresentation = (
  variant: BattleEncounterVariant | null,
): Pick<BattleEncounterView, 'kind' | 'title' | 'description' | 'effectLine'> => {
  if (!variant) {
    return {};
  }

  return {
    kind: variant.kind,
    title: variant.title,
    description: variant.description,
    effectLine: variant.effectLine,
  };
};

export const resolveFleeChancePercent = (
  player: Pick<BattlePlayerSnapshot, 'dexterity'>,
  enemy: Pick<BattleView['enemy'], 'dexterity' | 'isElite' | 'isBoss'>,
): number => {
  const dexterityDifference = player.dexterity - enemy.dexterity;
  const rankPenalty = resolveEnemyRankFleePenalty(enemy);

  return clampFleeChance(baseFleeChancePercent + dexterityDifference * dexterityFleeChanceStep - rankPenalty);
};

export const createBattleEncounter = (
  player: Pick<BattlePlayerSnapshot, 'dexterity'>,
  enemy: Pick<BattleView['enemy'], 'dexterity' | 'isElite' | 'isBoss'>,
  initialTurnOwner: TurnOwner,
  variant: BattleEncounterVariant | null = null,
): BattleEncounterView => ({
  status: 'OFFERED',
  initialTurnOwner: variant?.initialTurnOwner ?? initialTurnOwner,
  canFlee: true,
  fleeChancePercent: clampFleeChance(
    resolveFleeChancePercent(player, enemy) + (variant?.fleeChanceModifierPercent ?? 0),
  ),
  ...buildEncounterPresentation(variant),
});

export const isBattleEncounterOffered = (battle: Pick<BattleView, 'encounter'>): boolean => (
  battle.encounter?.status === 'OFFERED'
);
