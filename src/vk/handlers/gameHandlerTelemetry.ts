import type { AcquisitionSummaryView } from '../../modules/player/application/read-models/acquisition-summary';
import { buildBattleResultNextGoalView, buildPlayerNextGoalView } from '../../modules/player/application/read-models/next-goal';
import { buildPlayerSchoolRecognitionView } from '../../modules/player/application/read-models/school-recognition';
import { getEquippedRune } from '../../modules/player/domain/player-stats';
import { getSchoolNovicePathDefinitionForEnemy } from '../../modules/player/domain/school-novice-path';
import type { GameTelemetry } from '../../modules/shared/application/ports/GameTelemetry';
import { getSchoolDefinitionForArchetype } from '../../modules/runes/domain/rune-schools';
import type { BattleView, PlayerState } from '../../shared/types/game';
import { Logger } from '../../utils/logger';
import type { BattleReplyTelemetry } from './responders/battleReplyFlow';

export type ReturnRecapEntrySurface = 'start_existing' | 'skip_tutorial' | 'return_to_adventure';

type SchoolPresentationReason = 'first_rune_reward' | 'school_trial_completed';

type SchoolPresentation = {
  readonly schoolCode: string | null;
  readonly presentationReason: SchoolPresentationReason;
};

export class GameHandlerTelemetry {
  public constructor(private readonly telemetry: GameTelemetry) {}

  public createBattleReplyTelemetry(): BattleReplyTelemetry {
    return {
      trackFirstSchoolPresented: (player, acquisitionSummary) => (
        this.trackFirstSchoolPresented(player, acquisitionSummary)
      ),
      trackPostSessionNextGoalShown: (player, battle) => (
        this.trackPostSessionNextGoalShown(player, battle)
      ),
    };
  }

  public async trackReturnRecapShown(
    player: PlayerState,
    entrySurface: ReturnRecapEntrySurface,
  ): Promise<void> {
    const nextGoal = buildPlayerNextGoalView(player);
    const equippedRune = getEquippedRune(player);

    await this.safeTrack(async () => {
      await this.telemetry.returnRecapShown(player.userId, {
        entrySurface,
        hasEquippedRune: equippedRune !== null,
        currentSchoolCode: getSchoolDefinitionForArchetype(equippedRune?.archetypeCode)?.code ?? null,
        nextStepType: nextGoal.goalType,
      });
    });
  }

  public async trackSchoolNoviceRuneHubOpen(player: PlayerState): Promise<void> {
    const recognition = buildPlayerSchoolRecognitionView(player);
    const nextGoal = buildPlayerNextGoalView(player);

    if (!recognition || recognition.signEquipped || nextGoal.goalType !== 'equip_school_sign') {
      return;
    }

    await this.safeTrack(async () => {
      await this.telemetry.schoolNoviceFollowUpActionTaken(player.userId, {
        schoolCode: recognition.schoolCode,
        currentGoalType: nextGoal.goalType,
        actionType: 'open_runes',
        signEquipped: false,
        usedSchoolSign: false,
        battleId: null,
        enemyCode: null,
      });
    });
  }

  private async trackPostSessionNextGoalShown(player: PlayerState, battle: BattleView): Promise<void> {
    const nextGoal = buildBattleResultNextGoalView(battle, player);
    if (!nextGoal || !battle.result || battle.result === 'FLED') {
      return;
    }

    const battleOutcome = battle.result;
    const battleSchoolCode = battle.player.runeLoadout?.schoolCode
      ?? getSchoolDefinitionForArchetype(battle.player.runeLoadout?.archetypeCode)?.code
      ?? null;
    const novicePath = getSchoolNovicePathDefinitionForEnemy(battle.enemy.code);
    const isSchoolNoviceElite = novicePath !== null && novicePath.schoolCode === battleSchoolCode;

    await this.safeTrack(async () => {
      await this.telemetry.postSessionNextGoalShown(player.userId, {
        battleOutcome,
        hadRuneDrop: battle.rewards?.droppedRune != null,
        suggestedGoalType: nextGoal.goalType,
        enemyCode: battle.enemy.code,
        battleSchoolCode,
        isSchoolNoviceElite,
      });
    });
  }

  private async trackFirstSchoolPresented(
    player: PlayerState,
    acquisitionSummary: AcquisitionSummaryView | null | undefined,
  ): Promise<void> {
    const schoolPresentation = this.resolveSchoolPresentation(player, acquisitionSummary);
    const schoolCode = schoolPresentation?.schoolCode;
    if (!schoolPresentation || !schoolCode) {
      return;
    }

    await this.safeTrack(async () => {
      await this.telemetry.firstSchoolPresented(player.userId, {
        schoolCode,
        presentationSurface: 'battle_result',
        presentationReason: schoolPresentation.presentationReason,
      });
    });
  }

  private resolveSchoolPresentation(
    player: PlayerState,
    acquisitionSummary: AcquisitionSummaryView | null | undefined,
  ): SchoolPresentation | null {
    if (acquisitionSummary?.kind === 'school_trial_completed') {
      const recognition = buildPlayerSchoolRecognitionView(player);
      return {
        schoolCode: recognition?.schoolCode ?? null,
        presentationReason: 'school_trial_completed',
      };
    }

    if (acquisitionSummary?.kind !== 'new_rune' || player.runes.length !== 1) {
      return null;
    }

    const selectedRune = player.runes[player.currentRuneIndex] ?? player.runes[0] ?? null;
    return {
      schoolCode: getSchoolDefinitionForArchetype(selectedRune?.archetypeCode)?.code ?? null,
      presentationReason: 'first_rune_reward',
    };
  }

  private async safeTrack(operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      Logger.warn('Telemetry logging failed', error);
    }
  }
}
