import type { Context } from 'vk-io';
import type { CommandIntentSource } from '../../modules/shared/application/command-intent';
import {
  commandAliases,
  gameCommands,
  resolveCraftingRecipeCommand,
  resolveRuneCursorDeltaCommand,
  resolveRunePageSlotCommand,
  resolveRuneStatRerollCommand,
  resolveWorkshopCraftCommand,
  resolveWorkshopRepairCommand,
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

type LegacyTextIntentMatcher = (command: string) => boolean;

const legacyTextIntentCommands = new Set<string>([
  gameCommands.craftRune,
  gameCommands.destroyRune,
  gameCommands.equipRune,
  gameCommands.unequipRune,
  gameCommands.craftVitalCharm,
  gameCommands.craftKeenEdge,
  gameCommands.craftGuardPlate,
  gameCommands.craftRuneFocus,
  gameCommands.workshop,
  gameCommands.claimQuestReward,
  gameCommands.dailyTrace,
  gameCommands.location,
  gameCommands.skipTutorial,
  gameCommands.returnToAdventure,
  gameCommands.explore,
  gameCommands.engageBattle,
  gameCommands.fleeBattle,
  gameCommands.attack,
  gameCommands.defend,
  gameCommands.skills,
  gameCommands.skillSlot1,
  gameCommands.skillSlot2,
  gameCommands.spell,
  gameCommands.equipRuneSlot1,
  gameCommands.equipRuneSlot2,
]);

const legacyTextIntentMatchers: readonly LegacyTextIntentMatcher[] = [
  (command) => legacyTextIntentCommands.has(command),
  (command) => resolveRuneCursorDeltaCommand(command) !== null,
  (command) => resolveRunePageSlotCommand(command) !== null,
  (command) => resolveRuneStatRerollCommand(command) !== null,
  (command) => resolveCraftingRecipeCommand(command) !== null,
  (command) => resolveWorkshopCraftCommand(command) !== null,
  (command) => resolveWorkshopRepairCommand(command) !== null,
];

const supportsLegacyTextIntent = (command: string): boolean => (
  legacyTextIntentMatchers.some((matcher) => matcher(command))
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
