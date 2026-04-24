import type { BattleView } from '../../../shared/types/game';
import type { GameRandom } from '../../shared/application/ports/GameRandom';
import { isBattleEncounterOffered } from '../domain/battle-encounter';
import { BattleEngine } from '../domain/battle-engine';
import {
  resolvePlayerSignatureReactionChancePercent,
  shouldEnemyPrepareSignatureIntent,
} from '../domain/battle-tactics';

type BattlePlayerSnapshot = BattleView['player'];

const isPartyBattle = (battle: BattleView): battle is BattleView & { party: NonNullable<BattleView['party']> } => (
  battle.battleType === 'PARTY_PVE' && battle.party !== undefined && battle.party !== null
);

const listSignatureReactionPlayers = (battle: BattleView): readonly BattlePlayerSnapshot[] => {
  if (!isPartyBattle(battle)) {
    return [battle.player];
  }

  const livingMembers = battle.party.members
    .map((member) => member.snapshot)
    .filter((snapshot) => snapshot.currentHealth > 0);

  return livingMembers.length > 0 ? livingMembers : [battle.player];
};

const resolveBestSignatureReactionChancePercent = (battle: BattleView): number => (
  Math.max(
    ...listSignatureReactionPlayers(battle)
      .map((player) => resolvePlayerSignatureReactionChancePercent(player, battle.enemy)),
  )
);

const shouldResolveSignatureReaction = (battle: BattleView): boolean => (
  battle.status === 'ACTIVE'
  && battle.turnOwner === 'ENEMY'
  && !isBattleEncounterOffered(battle)
  && shouldEnemyPrepareSignatureIntent(battle.enemy)
);

export const resolveEnemyTurnWithSignatureReaction = (
  battle: BattleView,
  random: Pick<GameRandom, 'rollPercentage'>,
): BattleView => {
  if (!shouldResolveSignatureReaction(battle)) {
    return BattleEngine.resolveEnemyTurn(battle);
  }

  const signatureReactionChancePercent = resolveBestSignatureReactionChancePercent(battle);

  return BattleEngine.resolveEnemyTurn(battle, {
    signatureReactionChancePercent,
    signatureReactionSucceeded: random.rollPercentage(signatureReactionChancePercent),
  });
};
