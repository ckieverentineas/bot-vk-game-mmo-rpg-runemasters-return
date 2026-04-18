import type { Context } from 'vk-io';
import type { CommandIntentSource } from '../../modules/shared/application/command-intent';
import { commandAliases, gameCommands, resolveRuneStatRerollCommand } from '../commands/catalog';

export interface ResolvedCommandEnvelope {
  readonly command: string;
  readonly intentId: string | null;
  readonly stateKey: string | null;
  readonly intentSource: CommandIntentSource;
}

export const normalizeCommand = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return commandAliases[normalized] ?? normalized;
};

const supportsLegacyTextIntent = (command: string): boolean => (
  command === gameCommands.craftRune
  || command === gameCommands.destroyRune
  || resolveRuneStatRerollCommand(command) !== null
);

const buildLegacyTextIntentId = (ctx: Context, command: string): string | null => {
  const messageId = typeof ctx.conversationMessageId === 'number'
    ? ctx.conversationMessageId
    : typeof ctx.id === 'number'
      ? ctx.id
      : null;
  const peerId = typeof ctx.peerId === 'number' ? ctx.peerId : null;
  const senderId = typeof ctx.senderId === 'number' ? ctx.senderId : null;

  if (messageId === null || peerId === null || senderId === null) {
    return null;
  }

  return `legacy-text:${peerId}:${senderId}:${messageId}:${command}`;
};

export const resolveCommandEnvelope = (ctx: Context): ResolvedCommandEnvelope => {
  const payload = typeof ctx.messagePayload === 'object' && ctx.messagePayload !== null
    ? ctx.messagePayload as { command?: unknown; intentId?: unknown; stateKey?: unknown }
    : null;

  const raw = typeof payload?.command === 'string'
    ? payload.command
    : ctx.text ?? '';

  const command = normalizeCommand(raw);
  const payloadIntentId = typeof payload?.intentId === 'string' ? payload.intentId : null;
  const payloadStateKey = typeof payload?.stateKey === 'string' ? payload.stateKey : null;
  const legacyTextIntentId = payload === null && supportsLegacyTextIntent(command)
    ? buildLegacyTextIntentId(ctx, command)
    : null;

  return {
    command,
    intentId: payloadIntentId ?? legacyTextIntentId,
    stateKey: payloadStateKey,
    intentSource: payload !== null ? 'payload' : legacyTextIntentId ? 'legacy_text' : null,
  };
};

export const resolveCommand = (ctx: Context): string => resolveCommandEnvelope(ctx).command;
