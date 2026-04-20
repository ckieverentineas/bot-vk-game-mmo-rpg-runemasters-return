import { PerformBattleAction } from '../modules/combat/application/use-cases/PerformBattleAction';
import { GetActiveBattle } from '../modules/combat/application/use-cases/GetActiveBattle';
import { ExploreLocation } from '../modules/exploration/application/use-cases/ExploreLocation';
import { EnterTutorialMode } from '../modules/exploration/application/use-cases/EnterTutorialMode';
import { ReturnToAdventure } from '../modules/exploration/application/use-cases/ReturnToAdventure';
import { SkipTutorial } from '../modules/exploration/application/use-cases/SkipTutorial';
import { DeletePlayer } from '../modules/player/application/use-cases/DeletePlayer';
import { GetPlayerProfile } from '../modules/player/application/use-cases/GetPlayerProfile';
import { RegisterPlayer } from '../modules/player/application/use-cases/RegisterPlayer';
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
  const repository = new PrismaGameRepository(prisma);
  const random = new SystemGameRandom();
  const telemetry = new RepositoryGameTelemetry(repository);

  return {
    telemetry,
    registerPlayer: new RegisterPlayer(repository, telemetry),
    deletePlayer: new DeletePlayer(repository),
    getPlayerProfile: new GetPlayerProfile(repository),
    enterTutorialMode: new EnterTutorialMode(repository),
    returnToAdventure: new ReturnToAdventure(repository),
    skipTutorial: new SkipTutorial(repository),
    exploreLocation: new ExploreLocation(repository, random, telemetry),
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
