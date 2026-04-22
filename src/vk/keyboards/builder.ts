import { randomUUID } from 'node:crypto';

import { Keyboard } from 'vk-io';

import type { KeyboardBuilder, KeyboardBuildOptions, KeyboardLayout } from './types';

export const buildKeyboard = (
  layout: KeyboardLayout,
  options: KeyboardBuildOptions = {},
): KeyboardBuilder => {
  const keyboard = Keyboard.builder();

  layout.forEach((row, rowIndex) => {
    row.forEach(({ label, command, color, intentScoped, stateKey }) => {
      keyboard.textButton({
        label,
        payload: intentScoped && stateKey
          ? { command, intentId: randomUUID(), stateKey }
          : { command },
        color,
      });
    });

    if (rowIndex < layout.length - 1) {
      keyboard.row();
    }
  });

  return keyboard.oneTime(false).inline(options.inline === true);
};
