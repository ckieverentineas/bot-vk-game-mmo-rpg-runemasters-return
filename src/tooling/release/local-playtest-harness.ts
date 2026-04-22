import type { BattleActionType, BattleRuneActionSnapshot, BattleView, PlayerState } from '../../shared/types/game';
import { type GameCommand, gameCommands } from '../../vk/commands/catalog';

const requiredSchoolNoviceEvidenceCodes = ['ember', 'stone', 'gale', 'echo'] as const;
const requiredSchoolRuneHubFollowUpCodes = ['stone'] as const;
const requiredReturnRecapNextStepType = 'equip_school_sign';

type RequiredSchoolNoviceEvidenceCode = typeof requiredSchoolNoviceEvidenceCodes[number];
type SchoolEvidenceCounts = Readonly<Record<RequiredSchoolNoviceEvidenceCode, number>>;

interface LocalPlaytestSchoolEvidenceSummary {
  readonly noviceEliteCounts: SchoolEvidenceCounts;
  readonly alignedRewardCounts: SchoolEvidenceCounts;
  readonly runeHubFollowUpCounts: SchoolEvidenceCounts;
}

interface LocalPlaytestReturnRecapSummary {
  readonly shownCount: number;
  readonly nextStepTypes: readonly string[];
}

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
  readonly details?: string | Readonly<Record<string, unknown>> | null;
}

export interface LocalPlaytestSummaryInput {
  readonly scenarioName: string;
  readonly vkId: number;
  readonly player: PlayerState;
  readonly activeBattle: BattleView | null;
  readonly pendingRewardOpen?: boolean;
  readonly questRewardReplaySafe?: boolean | null;
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
  readonly pendingRewardOpen: boolean;
  readonly runeCount: number;
  readonly equippedRuneCount: number;
  readonly runes: readonly LocalPlaytestRuneSummary[];
  readonly logCounts: Readonly<Record<string, number>>;
  readonly schoolNoviceEliteEvidenceCounts: SchoolEvidenceCounts;
  readonly schoolNoviceAlignedRewardCounts: SchoolEvidenceCounts;
  readonly schoolNoviceRuneHubFollowUpCounts: SchoolEvidenceCounts;
  readonly suspiciousReplyCount: number;
  readonly trophyCollectionReplyCount: number;
  readonly questBookReplyCount: number;
  readonly questRewardClaimReplyCount: number;
  readonly questRewardReplaySafe: boolean | null;
  readonly returnRecapShownCount: number;
  readonly returnRecapNextStepTypes: readonly string[];
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

const isTrophyCollectionReply = (reply: string): boolean => (
  reply.includes('Трофей разобран')
);

const isQuestBookReply = (reply: string): boolean => (
  reply.includes('📜 Книга путей')
);

const isQuestRewardClaimReply = (reply: string): boolean => (
  reply.includes('📜 Запись закрыта') || reply.includes('📜 Запись уже закрыта')
);

const countLogsByAction = (logs: readonly LocalPlaytestLogEntry[]): Record<string, number> => (
  logs.reduce<Record<string, number>>((counts, log) => {
    counts[log.action] = (counts[log.action] ?? 0) + 1;
    return counts;
  }, {})
);

const parseLogDetails = (details: LocalPlaytestLogEntry['details']): Readonly<Record<string, unknown>> => {
  if (!details) {
    return {};
  }

  if (typeof details !== 'string') {
    return details;
  }

  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === 'object'
      ? parsed as Readonly<Record<string, unknown>>
      : {};
  } catch {
    return {};
  }
};

const createSchoolEvidenceCounts = (): Record<RequiredSchoolNoviceEvidenceCode, number> => ({
  ember: 0,
  stone: 0,
  gale: 0,
  echo: 0,
});

const isRequiredSchoolNoviceEvidenceCode = (value: unknown): value is RequiredSchoolNoviceEvidenceCode => (
  typeof value === 'string' && (requiredSchoolNoviceEvidenceCodes as readonly string[]).includes(value)
);

const incrementSchoolEvidenceCount = (
  counts: Record<RequiredSchoolNoviceEvidenceCode, number>,
  schoolCode: unknown,
): void => {
  if (isRequiredSchoolNoviceEvidenceCode(schoolCode)) {
    counts[schoolCode] += 1;
  }
};

const summarizeSchoolEvidence = (
  logs: readonly LocalPlaytestLogEntry[],
): LocalPlaytestSchoolEvidenceSummary => {
  const noviceEliteCounts = createSchoolEvidenceCounts();
  const alignedRewardCounts = createSchoolEvidenceCounts();
  const runeHubFollowUpCounts = createSchoolEvidenceCounts();

  for (const log of logs) {
    const details = parseLogDetails(log.details);

    if (log.action === 'school_novice_elite_encounter_started') {
      incrementSchoolEvidenceCount(noviceEliteCounts, details.schoolCode);
      continue;
    }

    if (
      log.action === 'reward_claim_applied'
      && details.isSchoolNoviceAligned === true
      && details.noviceTargetRewardRarity === 'UNUSUAL'
    ) {
      incrementSchoolEvidenceCount(alignedRewardCounts, details.novicePathSchoolCode);
      continue;
    }

    if (
      log.action === 'school_novice_follow_up_action_taken'
      && details.actionType === 'open_runes'
    ) {
      incrementSchoolEvidenceCount(runeHubFollowUpCounts, details.schoolCode);
    }
  }

  return {
    noviceEliteCounts,
    alignedRewardCounts,
    runeHubFollowUpCounts,
  };
};

const summarizeReturnRecapEvidence = (
  logs: readonly LocalPlaytestLogEntry[],
): LocalPlaytestReturnRecapSummary => {
  const nextStepTypes = new Set<string>();
  let shownCount = 0;

  for (const log of logs) {
    if (log.action !== 'return_recap_shown') {
      continue;
    }

    const details = parseLogDetails(log.details);
    shownCount += 1;

    if (typeof details.nextStepType === 'string' && details.nextStepType.trim().length > 0) {
      nextStepTypes.add(details.nextStepType.trim());
    }
  }

  return {
    shownCount,
    nextStepTypes: [...nextStepTypes].sort((left, right) => left.localeCompare(right)),
  };
};

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
  const schoolEvidence = summarizeSchoolEvidence(input.logs);
  const returnRecapEvidence = summarizeReturnRecapEvidence(input.logs);

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
    pendingRewardOpen: input.pendingRewardOpen ?? false,
    runeCount: input.player.runes.length,
    equippedRuneCount,
    runes: summarizeRunes(input.player),
    logCounts: countLogsByAction(input.logs),
    schoolNoviceEliteEvidenceCounts: schoolEvidence.noviceEliteCounts,
    schoolNoviceAlignedRewardCounts: schoolEvidence.alignedRewardCounts,
    schoolNoviceRuneHubFollowUpCounts: schoolEvidence.runeHubFollowUpCounts,
    suspiciousReplyCount: input.transcript.filter((entry) => isSuspiciousReply(entry.reply)).length,
    trophyCollectionReplyCount: input.transcript.filter((entry) => isTrophyCollectionReply(entry.reply)).length,
    questBookReplyCount: input.transcript.filter((entry) => isQuestBookReply(entry.reply)).length,
    questRewardClaimReplyCount: input.transcript.filter((entry) => isQuestRewardClaimReply(entry.reply)).length,
    questRewardReplaySafe: input.questRewardReplaySafe ?? null,
    returnRecapShownCount: returnRecapEvidence.shownCount,
    returnRecapNextStepTypes: returnRecapEvidence.nextStepTypes,
  };
};

export const listLocalPlaytestFailures = (summary: LocalPlaytestSummary): readonly string[] => {
  const failures: string[] = [];

  if (summary.activeBattleStillOpen) {
    failures.push(`${summary.scenarioName}: active battle is still open`);
  }

  if (summary.pendingRewardOpen) {
    failures.push(`${summary.scenarioName}: pending trophy reward is still open`);
  }

  if (summary.victories < 1) {
    failures.push(`${summary.scenarioName}: expected at least one victory`);
  }

  if (summary.victories >= 1 && summary.trophyCollectionReplyCount < 1) {
    failures.push(`${summary.scenarioName}: expected a trophy reward collection reply`);
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

  if (summary.questBookReplyCount < 1) {
    failures.push(`${summary.scenarioName}: expected a quest book reply`);
  }

  if (summary.questRewardClaimReplyCount < 1) {
    failures.push(`${summary.scenarioName}: expected a quest reward claim reply`);
  }

  if (summary.questRewardReplaySafe === false) {
    failures.push(`${summary.scenarioName}: quest reward replay was not safe`);
  }

  if (summary.scenarioName === 'payload' && summary.questRewardReplaySafe === null) {
    failures.push(`${summary.scenarioName}: quest reward replay was not checked`);
  }

  if (summary.returnRecapShownCount < 1) {
    failures.push(`${summary.scenarioName}: expected return recap evidence`);
  } else if (!summary.returnRecapNextStepTypes.includes(requiredReturnRecapNextStepType)) {
    failures.push(`${summary.scenarioName}: expected return recap next step ${requiredReturnRecapNextStepType}`);
  }

  for (const schoolCode of requiredSchoolNoviceEvidenceCodes) {
    if (summary.schoolNoviceEliteEvidenceCounts[schoolCode] < 1) {
      failures.push(`${summary.scenarioName}: expected ${schoolCode} school novice elite evidence`);
    }

    if (summary.schoolNoviceAlignedRewardCounts[schoolCode] < 1) {
      failures.push(`${summary.scenarioName}: expected ${schoolCode} school novice aligned reward evidence`);
    }
  }

  for (const schoolCode of requiredSchoolRuneHubFollowUpCodes) {
    if (summary.schoolNoviceRuneHubFollowUpCounts[schoolCode] < 1) {
      failures.push(`${summary.scenarioName}: expected ${schoolCode} school novice rune hub follow-up`);
    }
  }

  return failures;
};
