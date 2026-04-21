import type { BattleActionType, BattleRuneActionSnapshot, BattleView, PlayerState } from '../../shared/types/game';
import { type GameCommand, gameCommands } from '../../vk/commands/catalog';

export interface LocalPlaytestPayload {
  readonly command?: string;
  readonly intentId?: string;
  readonly stateKey?: string;
}

export interface LocalPlaytestReply {
  readonly message: string;
  readonly options: unknown;
}

export interface LocalPlaytestContext {
  readonly senderId: number;
  readonly peerId: number;
  readonly id: number;
  readonly conversationMessageId: number;
  readonly text: string;
  readonly messagePayload: LocalPlaytestPayload | null;
  readonly replies: LocalPlaytestReply[];
  reply(message: string, options: unknown): Promise<void>;
}

export interface CreateLocalPlaytestContextInput {
  readonly vkId: number;
  readonly peerId: number;
  readonly messageId: number;
  readonly command: string;
  readonly payload: LocalPlaytestPayload | null;
}

export interface LocalPlaytestTranscriptEntry {
  readonly label: string;
  readonly command: string;
  readonly payload: LocalPlaytestPayload | null;
  readonly reply: string;
}

export interface LocalPlaytestLogEntry {
  readonly action: string;
}

export interface LocalPlaytestSummaryInput {
  readonly scenarioName: string;
  readonly vkId: number;
  readonly player: PlayerState;
  readonly activeBattle: BattleView | null;
  readonly transcript: readonly LocalPlaytestTranscriptEntry[];
  readonly logs: readonly LocalPlaytestLogEntry[];
}

export interface LocalPlaytestRuneSummary {
  readonly name: string;
  readonly rarity: string;
  readonly archetypeCode: string | null | undefined;
  readonly isEquipped: boolean;
  readonly equippedSlot: number | null;
}

export interface LocalPlaytestSummary {
  readonly scenarioName: string;
  readonly vkId: number;
  readonly playerId: number;
  readonly userId: number;
  readonly level: number;
  readonly tutorialState: PlayerState['tutorialState'];
  readonly victories: number;
  readonly defeats: number;
  readonly activeBattleId: string | null;
  readonly activeBattleStillOpen: boolean;
  readonly runeCount: number;
  readonly equippedRuneCount: number;
  readonly runes: readonly LocalPlaytestRuneSummary[];
  readonly logCounts: Readonly<Record<string, number>>;
  readonly suspiciousReplyCount: number;
}

export interface LocalPlaytestBattleCommand {
  readonly command: GameCommand;
  readonly action: BattleActionType;
}

interface BattleSkillCommandCandidate {
  readonly command: GameCommand;
  readonly action: BattleActionType;
  readonly activeAbility: BattleRuneActionSnapshot | null | undefined;
}

export const createLocalPlaytestContext = (input: CreateLocalPlaytestContextInput): LocalPlaytestContext => {
  const replies: LocalPlaytestReply[] = [];

  return {
    senderId: input.vkId,
    peerId: input.peerId,
    id: input.messageId,
    conversationMessageId: input.messageId,
    text: input.payload === null ? input.command : '',
    messagePayload: input.payload,
    replies,
    async reply(message: string, options: unknown): Promise<void> {
      replies.push({ message, options });
    },
  };
};

const isBattleSkillReady = (
  battle: BattleView,
  candidate: BattleSkillCommandCandidate,
): boolean => {
  const activeAbility = candidate.activeAbility;
  return activeAbility !== null
    && activeAbility !== undefined
    && activeAbility.currentCooldown <= 0
    && battle.player.currentMana >= activeAbility.manaCost;
};

const chooseReadySkillCommand = (battle: BattleView): LocalPlaytestBattleCommand | null => {
  const candidates: readonly BattleSkillCommandCandidate[] = [
    {
      command: gameCommands.skillSlot1,
      action: 'RUNE_SKILL_SLOT_1',
      activeAbility: battle.player.runeLoadout?.activeAbility,
    },
    {
      command: gameCommands.skillSlot2,
      action: 'RUNE_SKILL_SLOT_2',
      activeAbility: battle.player.supportRuneLoadout?.activeAbility,
    },
  ];

  const candidate = candidates.find((entry) => isBattleSkillReady(battle, entry));
  return candidate
    ? {
      command: candidate.command,
      action: candidate.action,
    }
    : null;
};

export const chooseBattleCommand = (battle: BattleView | null): LocalPlaytestBattleCommand => {
  if (battle?.encounter?.status === 'OFFERED') {
    return {
      command: gameCommands.engageBattle,
      action: 'ENGAGE',
    };
  }

  const skillCommand = battle ? chooseReadySkillCommand(battle) : null;
  return skillCommand ?? {
    command: gameCommands.attack,
    action: 'ATTACK',
  };
};

const suspiciousReplyMarkers = [
  '<no reply>',
  'Команда не распознана',
  'Неизвестная команда',
  'Внутренняя ошибка',
] as const;

const isSuspiciousReply = (reply: string): boolean => (
  suspiciousReplyMarkers.some((marker) => reply.includes(marker))
);

const countLogsByAction = (logs: readonly LocalPlaytestLogEntry[]): Record<string, number> => (
  logs.reduce<Record<string, number>>((counts, log) => {
    counts[log.action] = (counts[log.action] ?? 0) + 1;
    return counts;
  }, {})
);

const summarizeRunes = (player: PlayerState): readonly LocalPlaytestRuneSummary[] => (
  player.runes.map((rune) => ({
    name: rune.name,
    rarity: rune.rarity,
    archetypeCode: rune.archetypeCode,
    isEquipped: rune.isEquipped,
    equippedSlot: rune.equippedSlot ?? null,
  }))
);

export const buildLocalPlaytestSummary = (input: LocalPlaytestSummaryInput): LocalPlaytestSummary => {
  const equippedRuneCount = input.player.runes.filter((rune) => rune.isEquipped).length;

  return {
    scenarioName: input.scenarioName,
    vkId: input.vkId,
    playerId: input.player.playerId,
    userId: input.player.userId,
    level: input.player.level,
    tutorialState: input.player.tutorialState,
    victories: input.player.victories,
    defeats: input.player.defeats,
    activeBattleId: input.player.activeBattleId,
    activeBattleStillOpen: input.activeBattle !== null || input.player.activeBattleId !== null,
    runeCount: input.player.runes.length,
    equippedRuneCount,
    runes: summarizeRunes(input.player),
    logCounts: countLogsByAction(input.logs),
    suspiciousReplyCount: input.transcript.filter((entry) => isSuspiciousReply(entry.reply)).length,
  };
};

export const listLocalPlaytestFailures = (summary: LocalPlaytestSummary): readonly string[] => {
  const failures: string[] = [];

  if (summary.activeBattleStillOpen) {
    failures.push(`${summary.scenarioName}: active battle is still open`);
  }

  if (summary.victories < 1) {
    failures.push(`${summary.scenarioName}: expected at least one victory`);
  }

  if (summary.runeCount < 1) {
    failures.push(`${summary.scenarioName}: expected at least one rune`);
  }

  if (summary.equippedRuneCount < 1) {
    failures.push(`${summary.scenarioName}: expected an equipped rune`);
  }

  if (summary.suspiciousReplyCount > 0) {
    failures.push(`${summary.scenarioName}: found suspicious bot replies`);
  }

  return failures;
};
