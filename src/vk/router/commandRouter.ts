import type { Context } from 'vk-io';
import { commandAliases } from '../commands/catalog';

export interface ResolvedCommandEnvelope {
  readonly command: string;
  readonly intentId: string | null;
  readonly stateKey: string | null;
}

export const normalizeCommand = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return commandAliases[normalized] ?? normalized;
};

export const resolveCommandEnvelope = (ctx: Context): ResolvedCommandEnvelope => {
  const payload = typeof ctx.messagePayload === 'object' && ctx.messagePayload !== null
    ? ctx.messagePayload as { command?: unknown; intentId?: unknown; stateKey?: unknown }
    : null;

  const raw = typeof payload?.command === 'string'
    ? payload.command
    : ctx.text ?? '';

  return {
    command: normalizeCommand(raw),
    intentId: typeof payload?.intentId === 'string' ? payload.intentId : null,
    stateKey: typeof payload?.stateKey === 'string' ? payload.stateKey : null,
  };
};

export const resolveCommand = (ctx: Context): string => resolveCommandEnvelope(ctx).command;
