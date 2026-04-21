import type {
  GameRepository,
  RecoverPendingRewardsResult,
} from '../../../shared/application/ports/GameRepository';

export class RecoverPendingRewardsOnStart {
  public constructor(
    private readonly repository: Pick<GameRepository, 'recoverPendingRewardsOnStart'>,
  ) {}

  public async execute(): Promise<RecoverPendingRewardsResult> {
    return this.repository.recoverPendingRewardsOnStart();
  }
}
