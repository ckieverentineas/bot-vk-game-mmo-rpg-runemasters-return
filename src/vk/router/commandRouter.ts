import type { Context } from 'vk-io';
import { commandAliases } from '../commands/catalog';

export const normalizeCommand = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return commandAliases[normalized] ?? normalized;
};

export const resolveCommand = (ctx: Context): string => {
  const payload = typeof ctx.messagePayload === 'object' && ctx.messagePayload !== null
    ? ctx.messagePayload as { command?: unknown }
    : null;

  const raw = typeof payload?.command === 'string'
    ? payload.command
    : ctx.text ?? '';

  return normalizeCommand(raw);
};
