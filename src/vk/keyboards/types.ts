import { Keyboard } from 'vk-io';

import type { GameCommand } from '../commands/catalog';

export type KeyboardBuilder = ReturnType<typeof Keyboard.builder>;
export type KeyboardColor =
  | typeof Keyboard.PRIMARY_COLOR
  | typeof Keyboard.SECONDARY_COLOR
  | typeof Keyboard.POSITIVE_COLOR
  | typeof Keyboard.NEGATIVE_COLOR;

export interface KeyboardBuildOptions {
  readonly inline?: boolean;
}

export interface KeyboardButtonDefinition {
  readonly label: string;
  readonly command: GameCommand;
  readonly color: KeyboardColor;
  readonly intentScoped?: boolean;
  readonly stateKey?: string;
}

export type KeyboardLayout = readonly (readonly KeyboardButtonDefinition[])[];
