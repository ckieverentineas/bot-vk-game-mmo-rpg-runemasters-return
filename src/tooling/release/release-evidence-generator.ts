import { listSchoolDefinitions } from '../../modules/runes/domain/rune-schools';
import {
  summarizeSchoolPathEvidence,
  type SchoolPathEvidenceLogEntry,
  type SchoolPathEvidenceRow,
} from './school-path-evidence-generator';

const trackedSchoolCodes = new Set(['ember', 'stone', 'gale', 'echo']);

export const releaseEvidenceTrackedActions = [
  'onboarding_started',
  'loadout_changed',
  'school_novice_elite_encounter_started',
  'school_novice_follow_up_action_taken',
  'return_recap_shown',
  'post_session_next_goal_shown',
  'reward_claim_applied',
  'battle_stale_action_rejected',
] as const;

type ReleaseEvidenceTrackedAction = typeof releaseEvidenceTrackedActions[number];
type ReleaseEvidenceVerdict = 'pass' | 'warn' | 'insufficient_evidence';

interface CounterAccumulator {
  eventCount: number;
  readonly users: Set<number>;
}

interface SchoolLoadoutAccumulator {
  readonly alignedRewardUsers: Set<number>;
  readonly openRunesAfterRewardUsers: Set<number>;
  readonly equipSignAfterRewardUsers: Set<number>;
  readonly loadoutChangedAfterRewardUsers: Set<number>;
  readonly nextBattleAfterRewardUsers: Set<number>;
  readonly rareSealUsers: Set<number>;
}

interface PostSessionAccumulator {
  shownCount: number;
  noviceEliteShownCount: number;
  readonly followUpUsers: Set<number>;
}

interface ReturnRecapAccumulator {
  shownCount: number;
  withoutEquippedRuneShownCount: number;
  withEquippedRuneShownCount: number;
  readonly followUpUsers: Set<number>;
}

interface PendingSurfaceMarker {
  readonly goalType: string;
  readonly shownAt: string;
}

export interface ReleaseEvidenceActionRow {
  readonly action: ReleaseEvidenceTrackedAction;
  readonly label: string;
  readonly eventCount: number;
  readonly uniqueUsers: number;
}

export interface OnboardingCoverageRow {
  readonly tutorialState: string;
  readonly eventCount: number;
  readonly uniqueUsers: number;
}

export interface ReleaseEvidenceLoadoutRow {
  readonly schoolCode: string;
  readonly schoolName: string;
  readonly alignedRewardUsers: number;
  readonly openRunesAfterRewardUsers: number;
  readonly equipSignAfterRewardUsers: number;
  readonly loadoutChangedAfterRewardUsers: number;
  readonly nextBattleAfterRewardUsers: number;
  readonly rareSealUsers: number;
}

export interface ReleaseEvidenceNextGoalRow {
  readonly goalType: string;
  readonly shownCount: number;
  readonly noviceEliteShownCount: number;
  readonly followUpUsers: number;
}

export interface ReleaseEvidenceReturnRecapRow {
  readonly nextStepType: string;
  readonly shownCount: number;
  readonly withoutEquippedRuneShownCount: number;
  readonly withEquippedRuneShownCount: number;
  readonly followUpUsers: number;
}

export interface ReleaseEvidenceExploitSummary {
  readonly duplicateRewardLedgerKeys: readonly string[];
  readonly duplicateRewardBattleIds: readonly string[];
  readonly staleActionRejectedCount: number;
  readonly staleActionRejectedUsers: number;
  readonly staleActionRejectedBattles: number;
}

export interface ReleaseEvidenceReport {
  readonly generatedAt: string;
  readonly requestedWindowStart: string | null;
  readonly requestedWindowEnd: string | null;
  readonly windowStart: string | null;
  readonly windowEnd: string | null;
  readonly uniqueUsers: number;
  readonly verdict: ReleaseEvidenceVerdict;
  readonly verdictReasons: readonly string[];
  readonly actionRows: readonly ReleaseEvidenceActionRow[];
  readonly onboardingRows: readonly OnboardingCoverageRow[];
  readonly schoolPathRows: readonly SchoolPathEvidenceRow[];
  readonly loadoutRows: readonly ReleaseEvidenceLoadoutRow[];
  readonly nextGoalRows: readonly ReleaseEvidenceNextGoalRow[];
  readonly returnRecapRows: readonly ReleaseEvidenceReturnRecapRow[];
  readonly exploitSummary: ReleaseEvidenceExploitSummary;
  readonly confidenceNotes: readonly string[];
}

const actionLabels: Readonly<Record<ReleaseEvidenceTrackedAction, string>> = {
  onboarding_started: '`onboarding_started`',
  loadout_changed: '`loadout_changed`',
  school_novice_elite_encounter_started: '`school_novice_elite_encounter_started`',
  school_novice_follow_up_action_taken: '`school_novice_follow_up_action_taken`',
  return_recap_shown: '`return_recap_shown`',
  post_session_next_goal_shown: '`post_session_next_goal_shown`',
  reward_claim_applied: '`reward_claim_applied`',
  battle_stale_action_rejected: '`battle_stale_action_rejected`',
};

const trackedActionSet = new Set<string>(releaseEvidenceTrackedActions);

const createCounterAccumulator = (): CounterAccumulator => ({
  eventCount: 0,
  users: new Set<number>(),
});

const createSchoolLoadoutAccumulator = (): SchoolLoadoutAccumulator => ({
  alignedRewardUsers: new Set<number>(),
  openRunesAfterRewardUsers: new Set<number>(),
  equipSignAfterRewardUsers: new Set<number>(),
  loadoutChangedAfterRewardUsers: new Set<number>(),
  nextBattleAfterRewardUsers: new Set<number>(),
  rareSealUsers: new Set<number>(),
});

const createPostSessionAccumulator = (): PostSessionAccumulator => ({
  shownCount: 0,
  noviceEliteShownCount: 0,
  followUpUsers: new Set<number>(),
});

const createReturnRecapAccumulator = (): ReturnRecapAccumulator => ({
  shownCount: 0,
  withoutEquippedRuneShownCount: 0,
  withEquippedRuneShownCount: 0,
  followUpUsers: new Set<number>(),
});

const parseDetails = (details: SchoolPathEvidenceLogEntry['details']): Record<string, unknown> => {
  if (!details) {
    return {};
  }

  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }

  return details;
};

const normalizeTimestamp = (value: string | Date): string => (
  typeof value === 'string' ? value : value.toISOString()
);

const normalizeSchoolCode = (value: unknown): string | null => (
  typeof value === 'string' && trackedSchoolCodes.has(value) ? value : null
);

const normalizeTextField = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

const createUserSchoolKey = (userId: number, schoolCode: string): string => `${userId}:${schoolCode}`;

const isNonUsualRarity = (value: unknown): boolean => (
  typeof value === 'string' && value !== 'USUAL'
);

const schoolDefinitions = listSchoolDefinitions().filter((school) => trackedSchoolCodes.has(school.code));

const resolveEvidenceVerdict = (
  schoolPathRows: readonly SchoolPathEvidenceRow[],
  loadoutRows: readonly ReleaseEvidenceLoadoutRow[],
  nextGoalRows: readonly ReleaseEvidenceNextGoalRow[],
  returnRecapRows: readonly ReleaseEvidenceReturnRecapRow[],
  exploitSummary: ReleaseEvidenceExploitSummary,
): { verdict: ReleaseEvidenceVerdict; reasons: readonly string[] } => {
  const totalNoviceEliteUsers = schoolPathRows.reduce((sum, row) => sum + row.noviceEliteUsers, 0);
  const totalAlignedRewardUsers = loadoutRows.reduce((sum, row) => sum + row.alignedRewardUsers, 0);
  const reasons: string[] = [];

  if (totalNoviceEliteUsers === 0) {
    return {
      verdict: 'insufficient_evidence',
      reasons: ['В логах нет `school_novice_elite_encounter_started`, поэтому school-first slice ещё не доказан runtime-evidence.'],
    };
  }

  if (totalAlignedRewardUsers === 0) {
    return {
      verdict: 'insufficient_evidence',
      reasons: ['В логах нет aligned `UNUSUAL` reward для school novice path, поэтому первый school payoff пока не подтверждён.'],
    };
  }

  const missingAlignedRewardSchools = schoolPathRows.filter((row) => row.noviceEliteUsers > 0 && row.noviceRewardUsers === 0);
  if (missingAlignedRewardSchools.length > 0) {
    reasons.push(`Есть school trial без подтверждённого aligned payoff: ${missingAlignedRewardSchools.map((row) => row.schoolName).join(', ')}.`);
  }

  const missingEquipFollowUpSchools = loadoutRows.filter((row) => (
    row.alignedRewardUsers > 0
    && row.equipSignAfterRewardUsers === 0
    && row.loadoutChangedAfterRewardUsers === 0
  ));
  if (missingEquipFollowUpSchools.length > 0) {
    reasons.push(`После novice payoff игроки не доводят знак до сборки: ${missingEquipFollowUpSchools.map((row) => row.schoolName).join(', ')}.`);
  }

  const totalPostSessionShownCount = nextGoalRows.reduce((sum, row) => sum + row.shownCount, 0);
  const novicePostSessionShownCount = nextGoalRows.reduce((sum, row) => sum + row.noviceEliteShownCount, 0);
  const postSessionFollowUpUsers = nextGoalRows.reduce((sum, row) => sum + row.followUpUsers, 0);
  if (totalPostSessionShownCount === 0) {
    reasons.push('В текущем окне нет `post_session_next_goal_shown`, поэтому next-goal clarity пока не подтверждена evidence pass.');
  } else if (novicePostSessionShownCount > 0 && postSessionFollowUpUsers === 0) {
    reasons.push('`post_session_next_goal_shown` пока не показывает follow-up proxy после school-result экранов.');
  }

  const returnRecapShownCount = returnRecapRows.reduce((sum, row) => sum + row.shownCount, 0);
  const returnRecapFollowUpUsers = returnRecapRows.reduce((sum, row) => sum + row.followUpUsers, 0);
  if (returnRecapShownCount === 0) {
    reasons.push('В текущем окне нет `return_recap_shown`, поэтому return clarity пока не подтверждена evidence pass.');
  } else if (returnRecapFollowUpUsers === 0) {
    reasons.push('`return_recap_shown` пока не показывает follow-up proxy после экрана возврата.');
  }

  if (exploitSummary.duplicateRewardLedgerKeys.length > 0) {
    reasons.push('Обнаружены дубли `reward_claim_applied` по `ledgerKey`.');
  }

  if (exploitSummary.duplicateRewardBattleIds.length > 0) {
    reasons.push('Обнаружены повторные reward-claim события для одного и того же `battleId`.');
  }

  if (exploitSummary.staleActionRejectedCount > 0) {
    reasons.push('Зафиксированы `battle_stale_action_rejected`; это нужно сверить с ручным smoke/pass до релиза.');
  }

  return {
    verdict: reasons.length > 0 ? 'warn' : 'pass',
    reasons,
  };
};

export const summarizeReleaseEvidence = (
  entries: readonly SchoolPathEvidenceLogEntry[],
  generatedAt: string,
  options?: {
    readonly requestedWindowStart?: string | null;
    readonly requestedWindowEnd?: string | null;
  },
): ReleaseEvidenceReport => {
  const sortedEntries = [...entries].sort((left, right) => {
    const leftTime = normalizeTimestamp(left.createdAt);
    const rightTime = normalizeTimestamp(right.createdAt);
    return leftTime.localeCompare(rightTime);
  });

  const actionAccumulators = new Map<ReleaseEvidenceTrackedAction, CounterAccumulator>(
    releaseEvidenceTrackedActions.map((action) => [action, createCounterAccumulator()]),
  );
  const onboardingAccumulators = new Map<string, CounterAccumulator>();
  const schoolLoadoutAccumulators = new Map(schoolDefinitions.map((school) => [school.code, createSchoolLoadoutAccumulator()]));
  const postSessionAccumulators = new Map<string, PostSessionAccumulator>();
  const returnRecapAccumulators = new Map<string, ReturnRecapAccumulator>();
  const rewardUnlockedByUserSchool = new Set<string>();
  const pendingPostSessionGoalsByUser = new Map<number, PendingSurfaceMarker[]>();
  const pendingReturnRecapsByUser = new Map<number, PendingSurfaceMarker[]>();
  const duplicateRewardLedgerKeyCounts = new Map<string, number>();
  const duplicateRewardBattleIdCounts = new Map<string, number>();
  const staleActionRejectedUsers = new Set<number>();
  const staleActionRejectedBattles = new Set<string>();
  const uniqueUsers = new Set<number>();
  let windowStart: string | null = null;
  let windowEnd: string | null = null;
  let staleActionRejectedCount = 0;

  const markMatchingFollowUp = (
    userId: number,
    goalType: string | null,
  ): void => {
    if (!goalType) {
      return;
    }

    const pendingGroups = [
      {
        pendingMap: pendingPostSessionGoalsByUser,
        markerMap: postSessionAccumulators,
      },
      {
        pendingMap: pendingReturnRecapsByUser,
        markerMap: returnRecapAccumulators,
      },
    ] as const;

    let selectedMatch:
      | {
        readonly pendingMap: Map<number, PendingSurfaceMarker[]>;
        readonly markerMap: Map<string, { followUpUsers: Set<number> }>;
        readonly matchingIndex: number;
        readonly shownAt: string;
      }
      | null = null;

    for (const group of pendingGroups) {
      const pendingValues = group.pendingMap.get(userId);
      if (!pendingValues || pendingValues.length === 0) {
        continue;
      }

      const matchingIndex = pendingValues.map((entry) => entry.goalType).lastIndexOf(goalType);
      if (matchingIndex === -1) {
        continue;
      }

      const matchingEntry = pendingValues[matchingIndex]!;
      if (!selectedMatch || matchingEntry.shownAt > selectedMatch.shownAt) {
        selectedMatch = {
          pendingMap: group.pendingMap,
          markerMap: group.markerMap,
          matchingIndex,
          shownAt: matchingEntry.shownAt,
        };
      }
    }

    if (!selectedMatch) {
      return;
    }

    const pendingValues = selectedMatch.pendingMap.get(userId)!;
    pendingValues.splice(selectedMatch.matchingIndex, 1);
    selectedMatch.markerMap.get(goalType)?.followUpUsers.add(userId);

    if (pendingValues.length > 0) {
      selectedMatch.pendingMap.set(userId, pendingValues);
      return;
    }

    selectedMatch.pendingMap.delete(userId);
  };

  for (const entry of sortedEntries) {
    const timestamp = normalizeTimestamp(entry.createdAt);
    const details = parseDetails(entry.details);
    uniqueUsers.add(entry.userId);

    if (!windowStart || timestamp < windowStart) {
      windowStart = timestamp;
    }
    if (!windowEnd || timestamp > windowEnd) {
      windowEnd = timestamp;
    }

    if (entry.action === 'school_novice_follow_up_action_taken') {
      const currentGoalType = normalizeTextField(details.currentGoalType);
      markMatchingFollowUp(entry.userId, currentGoalType);
    }

    if (trackedActionSet.has(entry.action)) {
      const actionAccumulator = actionAccumulators.get(entry.action as ReleaseEvidenceTrackedAction);
      if (actionAccumulator) {
        actionAccumulator.eventCount += 1;
        actionAccumulator.users.add(entry.userId);
      }
    }

    if (entry.action === 'onboarding_started') {
      const tutorialState = normalizeTextField(details.tutorialState) ?? 'unknown';
      const accumulator = onboardingAccumulators.get(tutorialState) ?? createCounterAccumulator();
      accumulator.eventCount += 1;
      accumulator.users.add(entry.userId);
      onboardingAccumulators.set(tutorialState, accumulator);
      continue;
    }

    if (entry.action === 'reward_claim_applied') {
      const ledgerKey = normalizeTextField(details.ledgerKey);
      if (ledgerKey) {
        duplicateRewardLedgerKeyCounts.set(ledgerKey, (duplicateRewardLedgerKeyCounts.get(ledgerKey) ?? 0) + 1);
      }

      const battleId = normalizeTextField(details.battleId);
      if (battleId) {
        duplicateRewardBattleIdCounts.set(battleId, (duplicateRewardBattleIdCounts.get(battleId) ?? 0) + 1);
      }

      const noviceSchoolCode = normalizeSchoolCode(details.novicePathSchoolCode);
      if (details.isSchoolNoviceAligned === true && noviceSchoolCode && details.noviceTargetRewardRarity === 'UNUSUAL') {
        const accumulator = schoolLoadoutAccumulators.get(noviceSchoolCode)!;
        accumulator.alignedRewardUsers.add(entry.userId);
        rewardUnlockedByUserSchool.add(createUserSchoolKey(entry.userId, noviceSchoolCode));
      }

      const battleSchoolCode = normalizeSchoolCode(details.battleSchoolCode);
      if (battleSchoolCode && details.rewardRuneRarity === 'RARE') {
        schoolLoadoutAccumulators.get(battleSchoolCode)!.rareSealUsers.add(entry.userId);
      }

      continue;
    }

    if (entry.action === 'school_novice_follow_up_action_taken') {
      const schoolCode = normalizeSchoolCode(details.schoolCode);
      if (!schoolCode) {
        continue;
      }

      if (!rewardUnlockedByUserSchool.has(createUserSchoolKey(entry.userId, schoolCode))) {
        continue;
      }

      const accumulator = schoolLoadoutAccumulators.get(schoolCode)!;
      switch (details.actionType) {
        case 'open_runes':
          accumulator.openRunesAfterRewardUsers.add(entry.userId);
          break;
        case 'equip_school_sign':
          if (details.signEquipped === true) {
            accumulator.equipSignAfterRewardUsers.add(entry.userId);
          }
          break;
        case 'start_next_battle':
          accumulator.nextBattleAfterRewardUsers.add(entry.userId);
          break;
        default:
          break;
      }

      continue;
    }

    if (entry.action === 'loadout_changed') {
      const afterSchoolCode = normalizeSchoolCode(details.afterSchoolCode);
      if (!afterSchoolCode) {
        continue;
      }

      if (!rewardUnlockedByUserSchool.has(createUserSchoolKey(entry.userId, afterSchoolCode))) {
        continue;
      }

      if (isNonUsualRarity(details.afterRarity) && typeof details.changeType === 'string' && details.changeType.startsWith('equip_')) {
        schoolLoadoutAccumulators.get(afterSchoolCode)!.loadoutChangedAfterRewardUsers.add(entry.userId);
      }

      continue;
    }

    if (entry.action === 'post_session_next_goal_shown') {
      const goalType = normalizeTextField(details.suggestedGoalType) ?? 'unknown';
      const accumulator = postSessionAccumulators.get(goalType) ?? createPostSessionAccumulator();
      accumulator.shownCount += 1;
      if (details.isSchoolNoviceElite === true) {
        accumulator.noviceEliteShownCount += 1;
      }
      postSessionAccumulators.set(goalType, accumulator);

      const pendingGoals = pendingPostSessionGoalsByUser.get(entry.userId) ?? [];
      pendingGoals.push({ goalType, shownAt: timestamp });
      pendingPostSessionGoalsByUser.set(entry.userId, pendingGoals);
      continue;
    }

    if (entry.action === 'return_recap_shown') {
      const nextStepType = normalizeTextField(details.nextStepType) ?? 'unknown';
      const accumulator = returnRecapAccumulators.get(nextStepType) ?? createReturnRecapAccumulator();
      accumulator.shownCount += 1;
      if (details.hasEquippedRune === true) {
        accumulator.withEquippedRuneShownCount += 1;
      } else {
        accumulator.withoutEquippedRuneShownCount += 1;
      }
      returnRecapAccumulators.set(nextStepType, accumulator);

      const pendingRecaps = pendingReturnRecapsByUser.get(entry.userId) ?? [];
      pendingRecaps.push({ goalType: nextStepType, shownAt: timestamp });
      pendingReturnRecapsByUser.set(entry.userId, pendingRecaps);
      continue;
    }

    if (entry.action === 'battle_stale_action_rejected') {
      staleActionRejectedCount += 1;
      staleActionRejectedUsers.add(entry.userId);
      const battleId = normalizeTextField(details.battleId);
      if (battleId) {
        staleActionRejectedBattles.add(battleId);
      }
    }
  }

  const actionRows = releaseEvidenceTrackedActions.map((action) => {
    const accumulator = actionAccumulators.get(action)!;
    return {
      action,
      label: actionLabels[action],
      eventCount: accumulator.eventCount,
      uniqueUsers: accumulator.users.size,
    } satisfies ReleaseEvidenceActionRow;
  });

  const onboardingRows = [...onboardingAccumulators.entries()]
    .map(([tutorialState, accumulator]) => ({
      tutorialState,
      eventCount: accumulator.eventCount,
      uniqueUsers: accumulator.users.size,
    } satisfies OnboardingCoverageRow))
    .sort((left, right) => {
      if (right.eventCount !== left.eventCount) {
        return right.eventCount - left.eventCount;
      }

      return left.tutorialState.localeCompare(right.tutorialState);
    });

  const schoolPathRows = summarizeSchoolPathEvidence(sortedEntries);
  const loadoutRows = schoolDefinitions.map((school) => {
    const accumulator = schoolLoadoutAccumulators.get(school.code)!;
    return {
      schoolCode: school.code,
      schoolName: school.name,
      alignedRewardUsers: accumulator.alignedRewardUsers.size,
      openRunesAfterRewardUsers: accumulator.openRunesAfterRewardUsers.size,
      equipSignAfterRewardUsers: accumulator.equipSignAfterRewardUsers.size,
      loadoutChangedAfterRewardUsers: accumulator.loadoutChangedAfterRewardUsers.size,
      nextBattleAfterRewardUsers: accumulator.nextBattleAfterRewardUsers.size,
      rareSealUsers: accumulator.rareSealUsers.size,
    } satisfies ReleaseEvidenceLoadoutRow;
  });

  const nextGoalRows = [...postSessionAccumulators.entries()]
    .map(([goalType, accumulator]) => ({
      goalType,
      shownCount: accumulator.shownCount,
      noviceEliteShownCount: accumulator.noviceEliteShownCount,
      followUpUsers: accumulator.followUpUsers.size,
    } satisfies ReleaseEvidenceNextGoalRow))
    .sort((left, right) => {
      if (right.shownCount !== left.shownCount) {
        return right.shownCount - left.shownCount;
      }

      return left.goalType.localeCompare(right.goalType);
    });

  const returnRecapRows = [...returnRecapAccumulators.entries()]
    .map(([nextStepType, accumulator]) => ({
      nextStepType,
      shownCount: accumulator.shownCount,
      withoutEquippedRuneShownCount: accumulator.withoutEquippedRuneShownCount,
      withEquippedRuneShownCount: accumulator.withEquippedRuneShownCount,
      followUpUsers: accumulator.followUpUsers.size,
    } satisfies ReleaseEvidenceReturnRecapRow))
    .sort((left, right) => {
      if (right.shownCount !== left.shownCount) {
        return right.shownCount - left.shownCount;
      }

      return left.nextStepType.localeCompare(right.nextStepType);
    });

  const exploitSummary = {
    duplicateRewardLedgerKeys: [...duplicateRewardLedgerKeyCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([ledgerKey]) => ledgerKey)
      .sort((left, right) => left.localeCompare(right)),
    duplicateRewardBattleIds: [...duplicateRewardBattleIdCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([battleId]) => battleId)
      .sort((left, right) => left.localeCompare(right)),
    staleActionRejectedCount,
    staleActionRejectedUsers: staleActionRejectedUsers.size,
    staleActionRejectedBattles: staleActionRejectedBattles.size,
  } satisfies ReleaseEvidenceExploitSummary;

  const verdictResult = resolveEvidenceVerdict(schoolPathRows, loadoutRows, nextGoalRows, returnRecapRows, exploitSummary);
  const onboardingStartedRow = actionRows.find((row) => row.action === 'onboarding_started');
  const totalNoviceEliteUsers = schoolPathRows.reduce((sum, row) => sum + row.noviceEliteUsers, 0);
  const confidenceNotes = [
    'Onboarding funnel остаётся частичным: в runtime ещё нет `first_school_presented`, `first_school_committed` и `tutorial_path_chosen`.',
    'Return recap follow-up считается только по явно сопоставленному `school_novice_follow_up_action_taken`, а не по полноценному session-link.',
    'Экономика не попадает в этот отчёт, потому что `economy_transaction_committed` ещё не входит в текущий shipped telemetry baseline.',
    ...(onboardingStartedRow && onboardingStartedRow.eventCount === 0
      ? ['В текущем окне нет `onboarding_started`, поэтому onboarding clarity можно читать только как coverage-gap, а не как полноценный funnel.']
      : []),
    ...(totalNoviceEliteUsers < schoolDefinitions.length
      ? ['По school-first funnel пока меньше одного полного прогона на каждую стартовую школу, поэтому итог нужно читать как предварительный evidence pass.']
      : []),
  ];

  return {
    generatedAt,
    requestedWindowStart: options?.requestedWindowStart ?? null,
    requestedWindowEnd: options?.requestedWindowEnd ?? null,
    windowStart,
    windowEnd,
    uniqueUsers: uniqueUsers.size,
    verdict: verdictResult.verdict,
    verdictReasons: verdictResult.reasons,
    actionRows,
    onboardingRows,
    schoolPathRows,
    loadoutRows,
    nextGoalRows,
    returnRecapRows,
    exploitSummary,
    confidenceNotes,
  };
};

const buildTable = (header: readonly string[], rows: readonly (readonly (string | number)[])[]): string[] => {
  if (rows.length === 0) {
    return ['_Нет данных в текущем окне._'];
  }

  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map((_) => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];
};

export const buildReleaseEvidenceMarkdown = (report: ReleaseEvidenceReport): string => {
  const verdictLines = report.verdictReasons.length > 0
    ? report.verdictReasons.map((reason) => `- ${reason}`)
    : ['- Явных release-blocker сигналов в текущей выборке не найдено.'];

  const lines = [
    '# Release Evidence Report',
    '',
    `Сгенерировано: ${report.generatedAt}`,
    `Запрошенное окно: ${report.requestedWindowStart ?? '—'} → ${report.requestedWindowEnd ?? '—'}`,
    `Окно evidence: ${report.windowStart ?? '—'} → ${report.windowEnd ?? '—'}`,
    `Уникальных игроков в выборке: ${report.uniqueUsers}`,
    '',
    '## Evidence verdict',
    '',
    `- Статус: \`${report.verdict}\``,
    ...verdictLines,
    '',
    '## Sample health',
    '',
    ...buildTable(
      ['Сигнал', 'Событий', 'Уникальных игроков'],
      report.actionRows.map((row) => [row.label, row.eventCount, row.uniqueUsers]),
    ),
    '',
    '## Onboarding clarity coverage',
    '',
    ...buildTable(
      ['Tutorial state', 'Событий', 'Уникальных игроков'],
      report.onboardingRows.map((row) => [row.tutorialState, row.eventCount, row.uniqueUsers]),
    ),
    '',
    '- Этот блок пока показывает только coverage по `onboarding_started`; полноценный onboarding funnel ещё не закрыт текущей instrumentation baseline.',
    '',
    '## School payoff funnel',
    '',
    ...buildTable(
      ['Школа', 'Novice elite', 'UNUSUAL reward', 'Open runes', 'Equip sign', 'Follow-up battle', 'RARE seal', 'Latest event'],
      report.schoolPathRows.map((row) => [
        row.schoolName,
        row.noviceEliteUsers,
        row.noviceRewardUsers,
        row.openRunesUsers,
        row.equipSignUsers,
        row.followUpBattleUsers,
        row.rareSealUsers,
        row.latestEventAt ?? '—',
      ]),
    ),
    '',
    '## Post-payoff loadout engagement',
    '',
    ...buildTable(
      ['Школа', 'Aligned reward', 'Open runes after reward', 'Equip sign after reward', 'Loadout change after reward', 'Next battle after reward', 'RARE seal'],
      report.loadoutRows.map((row) => [
        row.schoolName,
        row.alignedRewardUsers,
        row.openRunesAfterRewardUsers,
        row.equipSignAfterRewardUsers,
        row.loadoutChangedAfterRewardUsers,
        row.nextBattleAfterRewardUsers,
        row.rareSealUsers,
      ]),
    ),
    '',
    '## Post-session next-goal health',
    '',
    ...buildTable(
      ['Suggested goal', 'Shown', 'Novice elite shown', 'Follow-up users'],
      report.nextGoalRows.map((row) => [row.goalType, row.shownCount, row.noviceEliteShownCount, row.followUpUsers]),
    ),
    '',
    '## Return recap health',
    '',
    ...buildTable(
      ['Next step', 'Shown', 'Без руны', 'С руной', 'Follow-up users'],
      report.returnRecapRows.map((row) => [
        row.nextStepType,
        row.shownCount,
        row.withoutEquippedRuneShownCount,
        row.withEquippedRuneShownCount,
        row.followUpUsers,
      ]),
    ),
    '',
    '## QA / exploit guardrails',
    '',
    `- duplicate reward ledger keys: ${report.exploitSummary.duplicateRewardLedgerKeys.length > 0 ? report.exploitSummary.duplicateRewardLedgerKeys.join(', ') : 'нет'}`,
    `- duplicate reward battle ids: ${report.exploitSummary.duplicateRewardBattleIds.length > 0 ? report.exploitSummary.duplicateRewardBattleIds.join(', ') : 'нет'}`,
    `- stale action rejected: ${report.exploitSummary.staleActionRejectedCount} событий / ${report.exploitSummary.staleActionRejectedUsers} игроков / ${report.exploitSummary.staleActionRejectedBattles} боёв`,
    '',
    '## Confidence notes',
    '',
    ...report.confidenceNotes.map((note) => `- ${note}`),
  ];

  return lines.join('\n');
};
