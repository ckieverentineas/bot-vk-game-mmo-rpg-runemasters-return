import {
  createEntryKeyboard,
  createRuneKeyboard,
} from '../keyboards';
import { battleCommandRoutes } from './routes/battleCommandRoutes';
import { coreCommandRoutes } from './routes/coreCommandRoutes';
import {
  rewardCommandRoutes,
  rewardDynamicCommandRoutes,
} from './routes/rewardCommandRoutes';
import { questCommandRoutes } from './routes/questCommandRoutes';
import {
  runeCommandRoutes,
  runeDynamicCommandRoutes,
} from './routes/runeCommandRoutes';
import { tutorialCommandRoutes } from './routes/tutorialCommandRoutes';
import type {
  DynamicCommandRoute,
  StaticCommandRouteConfig,
} from './gameCommandRouteKit';

export type {
  CommandIntentContext,
  DynamicCommandRoute,
  GameCommandType,
  StaticCommandHandler,
} from './gameCommandRouteKit';

export { toRouteState } from './gameCommandRouteKit';

type ReplyKeyboard = ReturnType<typeof createEntryKeyboard>;
type ErrorKeyboardCode = 'player_not_found' | 'runes_not_found' | 'rune_not_found' | 'rune_slot_not_found';

export const errorCodeKeyboardFactoryByCode: Partial<Record<ErrorKeyboardCode, () => ReplyKeyboard>> = {
  player_not_found: createEntryKeyboard,
  runes_not_found: createRuneKeyboard,
  rune_not_found: createRuneKeyboard,
  rune_slot_not_found: createRuneKeyboard,
};

export const isErrorKeyboardCode = (errorCode: string): errorCode is ErrorKeyboardCode => (
  Object.prototype.hasOwnProperty.call(errorCodeKeyboardFactoryByCode, errorCode)
);

export const config: StaticCommandRouteConfig = {
  ...coreCommandRoutes,
  ...questCommandRoutes,
  ...tutorialCommandRoutes,
  ...rewardCommandRoutes,
  ...battleCommandRoutes,
  ...runeCommandRoutes,
};

export const dynamicCommandConfig = [
  ...runeDynamicCommandRoutes,
  ...rewardDynamicCommandRoutes,
] satisfies readonly DynamicCommandRoute[];
