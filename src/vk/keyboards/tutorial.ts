import { Keyboard } from 'vk-io';

import {
  buildExploreLocationIntentStateKey,
  buildReturnToAdventureIntentStateKey,
  buildSkipTutorialIntentStateKey,
} from '../../modules/exploration/application/command-intent-state';
import { isPlayerInTutorial } from '../../modules/player/domain/player-stats';
import type { PlayerState } from '../../shared/types/game';
import { gameCommands } from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder } from './types';

export const createTutorialKeyboard = (player: PlayerState): KeyboardBuilder => {
  const inTutorial = isPlayerInTutorial(player);
  const exploreStateKey = buildExploreLocationIntentStateKey(player);
  const skipTutorialStateKey = buildSkipTutorialIntentStateKey(player);
  const returnToAdventureStateKey = buildReturnToAdventureIntentStateKey(player);

  if (player.tutorialState === 'ACTIVE') {
    return buildKeyboard([
      [{
        label: '⚔️ Учебный бой',
        command: gameCommands.explore,
        color: Keyboard.POSITIVE_COLOR,
        intentScoped: true,
        stateKey: exploreStateKey,
      }],
      [{
        label: '⏭️ Пропустить обучение',
        command: gameCommands.skipTutorial,
        color: Keyboard.NEGATIVE_COLOR,
        intentScoped: true,
        stateKey: skipTutorialStateKey,
      }],
      [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
    ]);
  }

  if (inTutorial) {
    return buildKeyboard([
      [{
        label: '⚔️ Тренировочный бой',
        command: gameCommands.explore,
        color: Keyboard.POSITIVE_COLOR,
        intentScoped: true,
        stateKey: exploreStateKey,
      }],
      [{
        label: '🌍 В приключения',
        command: gameCommands.returnToAdventure,
        color: Keyboard.PRIMARY_COLOR,
        intentScoped: true,
        stateKey: returnToAdventureStateKey,
      }],
      [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
    ]);
  }

  return buildKeyboard([
    [{
      label: '⚔️ Исследовать',
      command: gameCommands.explore,
      color: Keyboard.POSITIVE_COLOR,
      intentScoped: true,
      stateKey: exploreStateKey,
    }],
    [{ label: '◀ Меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR }],
  ]);
};
