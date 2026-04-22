import { assertValidGameContent } from '../content/validation/validate-game-content';
import { buildWorldCatalog } from '../content/world';
import { gameContent } from '../content/game-content';
import { PerformBattleAction } from '../modules/combat/application/use-cases/PerformBattleAction';
import { GetActiveBattle } from '../modules/combat/application/use-cases/GetActiveBattle';
import { ExploreLocation } from '../modules/exploration/application/use-cases/ExploreLocation';
import { EnterTutorialMode } from '../modules/exploration/application/use-cases/EnterTutorialMode';
import { ReturnToAdventure } from '../modules/exploration/application/use-cases/ReturnToAdventure';
import { SkipTutorial } from '../modules/exploration/application/use-cases/SkipTutorial';
import { DeletePlayer } from '../modules/player/application/use-cases/DeletePlayer';
import { GetPlayerProfile } from '../modules/player/application/use-cases/GetPlayerProfile';
import { RegisterPlayer } from '../modules/player/application/use-cases/RegisterPlayer';
import { CollectPendingReward } from '../modules/rewards/application/use-cases/CollectPendingReward';
import { GetPendingReward } from '../modules/rewards/application/use-cases/GetPendingReward';
import { RecoverPendingRewardsOnStart } from '../modules/rewards/application/use-cases/RecoverPendingRewardsOnStart';
import { CraftRune } from '../modules/runes/application/use-cases/CraftRune';
import { DestroyCurrentRune } from '../modules/runes/application/use-cases/DestroyCurrentRune';
import { EquipCurrentRune } from '../modules/runes/application/use-cases/EquipCurrentRune';
import { GetRuneCollection } from '../modules/runes/application/use-cases/GetRuneCollection';
import { MoveRuneCursor } from '../modules/runes/application/use-cases/MoveRuneCursor';
import { RerollCurrentRuneStat } from '../modules/runes/application/use-cases/RerollCurrentRuneStat';
import { SelectRunePageSlot } from '../modules/runes/application/use-cases/SelectRunePageSlot';
import { UnequipCurrentRune } from '../modules/runes/application/use-cases/UnequipCurrentRune';
import { PrismaGameRepository } from '../modules/shared/infrastructure/prisma/PrismaGameRepository';
import { SystemGameRandom } from '../modules/shared/infrastructure/random/SystemGameRandom';
import { RepositoryGameTelemetry } from '../modules/shared/infrastructure/telemetry/RepositoryGameTelemetry';
import { prisma } from '../database/client';
import type { GameTelemetry } from '../modules/shared/application/ports/GameTelemetry';

export interface AppServices {
  telemetry: GameTelemetry;
  recoverPendingRewardsOnStart: RecoverPendingRewardsOnStart;
  getPendingReward: GetPendingReward;
  collectPendingReward: CollectPendingReward;
  registerPlayer: RegisterPlayer;
  deletePlayer: DeletePlayer;
  getPlayerProfile: GetPlayerProfile;
  enterTutorialMode: EnterTutorialMode;
  returnToAdventure: ReturnToAdventure;
  skipTutorial: SkipTutorial;
  exploreLocation: ExploreLocation;
  getActiveBattle: GetActiveBattle;
  performBattleAction: PerformBattleAction;
  getRuneCollection: GetRuneCollection;
  moveRuneCursor: MoveRuneCursor;
  selectRunePageSlot: SelectRunePageSlot;
  equipCurrentRune: EquipCurrentRune;
  unequipCurrentRune: UnequipCurrentRune;
  craftRune: CraftRune;
  rerollCurrentRuneStat: RerollCurrentRuneStat;
  destroyCurrentRune: DestroyCurrentRune;
}

export const createAppServices = (): AppServices => {
  assertValidGameContent();

  const repository = new PrismaGameRepository(prisma);
  const worldCatalog = buildWorldCatalog(gameContent.world);
  const random = new SystemGameRandom();
  const telemetry = new RepositoryGameTelemetry(repository);

  return {
    telemetry,
    recoverPendingRewardsOnStart: new RecoverPendingRewardsOnStart(repository),
    getPendingReward: new GetPendingReward(repository),
    collectPendingReward: new CollectPendingReward(repository),
    registerPlayer: new RegisterPlayer(repository, telemetry),
    deletePlayer: new DeletePlayer(repository),
    getPlayerProfile: new GetPlayerProfile(repository),
    enterTutorialMode: new EnterTutorialMode(repository),
    returnToAdventure: new ReturnToAdventure(repository, telemetry),
    skipTutorial: new SkipTutorial(repository, telemetry),
    exploreLocation: new ExploreLocation(repository, worldCatalog, random, telemetry),
    getActiveBattle: new GetActiveBattle(repository, random),
    performBattleAction: new PerformBattleAction(repository, random),
    getRuneCollection: new GetRuneCollection(repository),
    moveRuneCursor: new MoveRuneCursor(repository),
    selectRunePageSlot: new SelectRunePageSlot(repository),
    equipCurrentRune: new EquipCurrentRune(repository, telemetry),
    unequipCurrentRune: new UnequipCurrentRune(repository, telemetry),
    craftRune: new CraftRune(repository, random),
    rerollCurrentRuneStat: new RerollCurrentRuneStat(repository, random),
    destroyCurrentRune: new DestroyCurrentRune(repository),
  };
};
