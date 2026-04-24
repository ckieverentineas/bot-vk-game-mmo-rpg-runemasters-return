import { Keyboard } from 'vk-io';

import { gameCommands } from '../commands/catalog';
import type { KeyboardButtonDefinition, KeyboardLayout } from './types';

type VictoryExploreCommand = typeof gameCommands.explore | typeof gameCommands.exploreParty;

interface PostVictoryNavigationOptions {
  readonly includeLootButton: boolean;
  readonly exploreLabel?: string;
  readonly exploreCommand?: VictoryExploreCommand;
  readonly exploreIntentScoped?: boolean;
  readonly exploreStateKey?: string;
}

const createExploreButton = (
  label: string,
  command: VictoryExploreCommand,
  intentScoped: boolean,
  stateKey?: string,
): KeyboardButtonDefinition => ({
  label,
  command,
  color: Keyboard.POSITIVE_COLOR,
  intentScoped,
  stateKey,
});

export const createPostVictoryNavigationRows = ({
  includeLootButton,
  exploreLabel = '⚔️ Исследовать',
  exploreCommand = gameCommands.explore,
  exploreIntentScoped = false,
  exploreStateKey,
}: PostVictoryNavigationOptions): KeyboardLayout => {
  const runeButton: KeyboardButtonDefinition = {
    label: '🔮 Руны',
    command: gameCommands.runeCollection,
    color: Keyboard.PRIMARY_COLOR,
  };
  const exploreButton = createExploreButton(
    exploreLabel,
    exploreCommand,
    exploreIntentScoped,
    exploreStateKey,
  );
  const partyButton: KeyboardButtonDefinition = {
    label: '🤝 Пати',
    command: gameCommands.party,
    color: Keyboard.PRIMARY_COLOR,
  };

  if (!includeLootButton) {
    return [
      [runeButton, exploreButton],
      [partyButton],
    ];
  }

  return [
    [
      {
        label: '🎒 Добыча',
        command: gameCommands.pendingReward,
        color: Keyboard.POSITIVE_COLOR,
      },
      runeButton,
    ],
    [exploreButton, partyButton],
  ];
};
