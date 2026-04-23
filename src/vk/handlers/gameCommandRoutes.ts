import {
  createEntryKeyboard,
  createRuneKeyboard,
} from '../keyboards';
import { battleCommandRoutes } from './routes/battleCommandRoutes';
import {
  bestiaryCommandRoutes,
  bestiaryDynamicCommandRoutes,
} from './routes/bestiaryCommandRoutes';
import { coreCommandRoutes } from './routes/coreCommandRoutes';
import {
  rewardCommandRoutes,
  rewardDynamicCommandRoutes,
} from './routes/rewardCommandRoutes';
import {
  questCommandRoutes,
  questDynamicCommandRoutes,
} from './routes/questCommandRoutes';
import {
  partyCommandRoutes,
  partyDynamicCommandRoutes,
} from './routes/partyCommandRoutes';
import {
  runeCommandRoutes,
  runeDynamicCommandRoutes,
} from './routes/runeCommandRoutes';
import { tutorialCommandRoutes } from './routes/tutorialCommandRoutes';
import {
  workshopCommandRoutes,
  workshopDynamicCommandRoutes,
} from './routes/workshopCommandRoutes';
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
  ...bestiaryCommandRoutes,
  ...partyCommandRoutes,
  ...tutorialCommandRoutes,
  ...rewardCommandRoutes,
  ...battleCommandRoutes,
  ...runeCommandRoutes,
  ...workshopCommandRoutes,
};

export const dynamicCommandConfig = [
  ...runeDynamicCommandRoutes,
  ...workshopDynamicCommandRoutes,
  ...rewardDynamicCommandRoutes,
  ...questDynamicCommandRoutes,
  ...partyDynamicCommandRoutes,
  ...bestiaryDynamicCommandRoutes,
] satisfies readonly DynamicCommandRoute[];
