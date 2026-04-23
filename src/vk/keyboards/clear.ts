import { buildKeyboard } from './builder';
import type { KeyboardBuilder } from './types';

export const createKeyboardClear = (): KeyboardBuilder => buildKeyboard([]);
