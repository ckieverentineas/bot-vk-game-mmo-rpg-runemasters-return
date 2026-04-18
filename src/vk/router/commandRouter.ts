import type { Context } from 'vk-io';
import type { CommandIntentSource } from '../../modules/shared/application/command-intent';
import {
  commandAliases,
  gameCommands,
  resolveRuneCursorDeltaCommand,
  resolveRunePageSlotCommand,
  resolveRuneStatRerollCommand,
  resolveStatAllocationCommand,
} from '../commands/catalog';

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
  || command === gameCommands.equipRune
  || command === gameCommands.unequipRune
  || resolveRuneCursorDeltaCommand(command) !== null
  || resolveRunePageSlotCommand(command) !== null
  || command === gameCommands.location
  || command === gameCommands.skipTutorial
  || command === gameCommands.returnToAdventure
  || command === gameCommands.explore
  || command === gameCommands.resetStats
  || command === gameCommands.attack
  || command === gameCommands.defend
  || command === gameCommands.skills
  || command === gameCommands.spell
  || resolveStatAllocationCommand(command) !== null
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
  const hasPayloadCommand = typeof payload?.command === 'string';
  const hasPayloadIntentId = typeof payload?.intentId === 'string';
  const hasPayloadStateKey = typeof payload?.stateKey === 'string';
  const payloadOwnsCommand = hasPayloadCommand || hasPayloadIntentId || hasPayloadStateKey;

  const raw = hasPayloadCommand
    ? payload.command as string
    : ctx.text ?? '';

  const command = normalizeCommand(raw);
  const payloadIntentId = hasPayloadIntentId ? payload.intentId as string : null;
  const payloadStateKey = hasPayloadStateKey ? payload.stateKey as string : null;
  const legacyTextIntentId = !payloadOwnsCommand && supportsLegacyTextIntent(command)
    ? buildLegacyTextIntentId(ctx, command)
    : null;
  const legacyTextIntentRequired = !payloadOwnsCommand && supportsLegacyTextIntent(command);

  return {
    command,
    intentId: payloadIntentId ?? legacyTextIntentId,
    stateKey: payloadStateKey,
    intentSource: payloadOwnsCommand ? 'payload' : legacyTextIntentRequired ? 'legacy_text' : null,
  };
};

export const resolveCommand = (ctx: Context): string => resolveCommandEnvelope(ctx).command;
