import type { Context } from 'vk-io';
import type { CommandIntentSource } from '../../modules/shared/application/command-intent';
import {
  commandAliases,
  gameCommands,
  resolveCraftingRecipeCommand,
  resolveRuneCursorDeltaCommand,
  resolveRunePageSlotCommand,
  resolveRuneStatRerollCommand,
  resolveUseConsumableCommand,
  resolveWorkshopAwakenCommand,
  resolveWorkshopCraftCommand,
  resolveWorkshopRepairCommand,
  resolveWorkshopShopCommand,
} from '../commands/catalog';

export interface ResolvedCommandEnvelope {
  readonly command: string;
  readonly commandArgument: string | null;
  readonly intentId: string | null;
  readonly stateKey: string | null;
  readonly intentSource: CommandIntentSource;
}

export const normalizeCommand = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return commandAliases[normalized] ?? normalized;
};

const staticGameCommandValues = new Set<string>(Object.values(gameCommands));

const resolveStartCommandArgument = (raw: string, normalizedCommand: string): string | null => {
  if (staticGameCommandValues.has(normalizedCommand)) {
    return null;
  }

  const trimmed = raw.trim();
  const [head = ''] = trimmed.split(/\s+/u, 1);
  if (normalizeCommand(head) !== gameCommands.start) {
    return null;
  }

  const argument = trimmed.slice(head.length).trim();
  return argument.length > 0 ? argument : null;
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
  gameCommands.useHealingPill,
  gameCommands.useFocusPill,
  gameCommands.useGuardPill,
  gameCommands.useClarityPill,
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
  (command) => resolveUseConsumableCommand(command) !== null,
  (command) => resolveWorkshopCraftCommand(command) !== null,
  (command) => resolveWorkshopAwakenCommand(command) !== null,
  (command) => resolveWorkshopRepairCommand(command) !== null,
  (command) => resolveWorkshopShopCommand(command) !== null,
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

  const normalizedCommand = normalizeCommand(raw);
  const commandArgument = payloadOwnsCommand ? null : resolveStartCommandArgument(raw, normalizedCommand);
  const command = commandArgument === null ? normalizedCommand : gameCommands.start;
  const payloadIntentId = hasPayloadIntentId ? payload.intentId as string : null;
  const payloadStateKey = hasPayloadStateKey ? payload.stateKey as string : null;
  const legacyTextIntentId = !payloadOwnsCommand && supportsLegacyTextIntent(command)
    ? buildLegacyTextIntentId(ctx, command)
    : null;
  const legacyTextIntentRequired = !payloadOwnsCommand && supportsLegacyTextIntent(command);

  return {
    command,
    commandArgument,
    intentId: payloadIntentId ?? legacyTextIntentId,
    stateKey: payloadStateKey,
    intentSource: payloadOwnsCommand ? 'payload' : legacyTextIntentRequired ? 'legacy_text' : null,
  };
};

export const resolveCommand = (ctx: Context): string => resolveCommandEnvelope(ctx).command;
