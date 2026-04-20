import type { GameTelemetry } from '../../application/ports/GameTelemetry';
import type { GameRepository } from '../../application/ports/GameRepository';

export class RepositoryGameTelemetry implements GameTelemetry {
  public constructor(private readonly repository: Pick<GameRepository, 'log'>) {}

  public async onboardingStarted(
    userId: number,
    payload: Parameters<GameTelemetry['onboardingStarted']>[1],
  ): Promise<void> {
    await this.log(userId, 'onboarding_started', payload);
  }

  public async tutorialPathChosen(
    userId: number,
    payload: Parameters<GameTelemetry['tutorialPathChosen']>[1],
  ): Promise<void> {
    await this.log(userId, 'tutorial_path_chosen', payload);
  }

  public async loadoutChanged(
    userId: number,
    payload: Parameters<GameTelemetry['loadoutChanged']>[1],
  ): Promise<void> {
    await this.log(userId, 'loadout_changed', payload);
  }

  public async schoolNoviceEliteEncounterStarted(
    userId: number,
    payload: Parameters<GameTelemetry['schoolNoviceEliteEncounterStarted']>[1],
  ): Promise<void> {
    await this.log(userId, 'school_novice_elite_encounter_started', payload);
  }

  public async firstSchoolPresented(
    userId: number,
    payload: Parameters<GameTelemetry['firstSchoolPresented']>[1],
  ): Promise<void> {
    await this.log(userId, 'first_school_presented', payload);
  }

  public async firstSchoolCommitted(
    userId: number,
    payload: Parameters<GameTelemetry['firstSchoolCommitted']>[1],
  ): Promise<void> {
    await this.log(userId, 'first_school_committed', payload);
  }

  public async schoolNoviceFollowUpActionTaken(
    userId: number,
    payload: Parameters<GameTelemetry['schoolNoviceFollowUpActionTaken']>[1],
  ): Promise<void> {
    await this.log(userId, 'school_novice_follow_up_action_taken', payload);
  }

  public async returnRecapShown(
    userId: number,
    payload: Parameters<GameTelemetry['returnRecapShown']>[1],
  ): Promise<void> {
    await this.log(userId, 'return_recap_shown', payload);
  }

  public async postSessionNextGoalShown(
    userId: number,
    payload: Parameters<GameTelemetry['postSessionNextGoalShown']>[1],
  ): Promise<void> {
    await this.log(userId, 'post_session_next_goal_shown', payload);
  }

  private async log(userId: number, action: string, details: Record<string, unknown>): Promise<void> {
    await this.repository.log(userId, action, {
      event_version: 1,
      ...details,
    });
  }
}
