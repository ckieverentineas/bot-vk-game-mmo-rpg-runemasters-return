import { PerformBattleAction } from '../modules/combat/application/use-cases/PerformBattleAction';
import { GetActiveBattle } from '../modules/combat/application/use-cases/GetActiveBattle';
import { ExploreLocation } from '../modules/exploration/application/use-cases/ExploreLocation';
import { EnterTutorialMode } from '../modules/exploration/application/use-cases/EnterTutorialMode';
import { ReturnToAdventure } from '../modules/exploration/application/use-cases/ReturnToAdventure';
import { SkipTutorial } from '../modules/exploration/application/use-cases/SkipTutorial';
import { AllocateStatPoint } from '../modules/player/application/use-cases/AllocateStatPoint';
import { DeletePlayer } from '../modules/player/application/use-cases/DeletePlayer';
import { GetPlayerProfile } from '../modules/player/application/use-cases/GetPlayerProfile';
import { RegisterPlayer } from '../modules/player/application/use-cases/RegisterPlayer';
import { ResetAllocatedStats } from '../modules/player/application/use-cases/ResetAllocatedStats';
import { CraftRune } from '../modules/runes/application/use-cases/CraftRune';
import { DestroyCurrentRune } from '../modules/runes/application/use-cases/DestroyCurrentRune';
import { EquipCurrentRune } from '../modules/runes/application/use-cases/EquipCurrentRune';
import { GetRuneCollection } from '../modules/runes/application/use-cases/GetRuneCollection';
import { MoveRuneCursor } from '../modules/runes/application/use-cases/MoveRuneCursor';
import { RerollCurrentRuneStat } from '../modules/runes/application/use-cases/RerollCurrentRuneStat';
import { UnequipCurrentRune } from '../modules/runes/application/use-cases/UnequipCurrentRune';
import { PrismaGameRepository } from '../modules/shared/infrastructure/prisma/PrismaGameRepository';
import { prisma } from '../database/client';

export interface AppServices {
  registerPlayer: RegisterPlayer;
  deletePlayer: DeletePlayer;
  getPlayerProfile: GetPlayerProfile;
  allocateStatPoint: AllocateStatPoint;
  resetAllocatedStats: ResetAllocatedStats;
  enterTutorialMode: EnterTutorialMode;
  returnToAdventure: ReturnToAdventure;
  skipTutorial: SkipTutorial;
  exploreLocation: ExploreLocation;
  getActiveBattle: GetActiveBattle;
  performBattleAction: PerformBattleAction;
  getRuneCollection: GetRuneCollection;
  moveRuneCursor: MoveRuneCursor;
  equipCurrentRune: EquipCurrentRune;
  unequipCurrentRune: UnequipCurrentRune;
  craftRune: CraftRune;
  rerollCurrentRuneStat: RerollCurrentRuneStat;
  destroyCurrentRune: DestroyCurrentRune;
}

export const createAppServices = (): AppServices => {
  const repository = new PrismaGameRepository(prisma);

  return {
    registerPlayer: new RegisterPlayer(repository),
    deletePlayer: new DeletePlayer(repository),
    getPlayerProfile: new GetPlayerProfile(repository),
    allocateStatPoint: new AllocateStatPoint(repository),
    resetAllocatedStats: new ResetAllocatedStats(repository),
    enterTutorialMode: new EnterTutorialMode(repository),
    returnToAdventure: new ReturnToAdventure(repository),
    skipTutorial: new SkipTutorial(repository),
    exploreLocation: new ExploreLocation(repository),
    getActiveBattle: new GetActiveBattle(repository),
    performBattleAction: new PerformBattleAction(repository),
    getRuneCollection: new GetRuneCollection(repository),
    moveRuneCursor: new MoveRuneCursor(repository),
    equipCurrentRune: new EquipCurrentRune(repository),
    unequipCurrentRune: new UnequipCurrentRune(repository),
    craftRune: new CraftRune(repository),
    rerollCurrentRuneStat: new RerollCurrentRuneStat(repository),
    destroyCurrentRune: new DestroyCurrentRune(repository),
  };
};
