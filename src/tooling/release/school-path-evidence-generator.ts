import { listSchoolDefinitions } from '../../modules/runes/domain/rune-schools';

const trackedSchoolCodes = new Set(['ember', 'stone', 'gale', 'echo']);

interface EvidenceAccumulator {
  readonly noviceEliteUsers: Set<number>;
  readonly noviceRewardUsers: Set<number>;
  readonly openRunesUsers: Set<number>;
  readonly equipSignUsers: Set<number>;
  readonly followUpBattleUsers: Set<number>;
  readonly rareSealUsers: Set<number>;
  latestEventAt: string | null;
}

export interface SchoolPathEvidenceLogEntry {
  readonly userId: number;
  readonly action: string;
  readonly details: string | Record<string, unknown> | null;
  readonly createdAt: string | Date;
}

export interface SchoolPathEvidenceRow {
  readonly schoolCode: string;
  readonly schoolName: string;
  readonly noviceEliteUsers: number;
  readonly noviceRewardUsers: number;
  readonly openRunesUsers: number;
  readonly equipSignUsers: number;
  readonly followUpBattleUsers: number;
  readonly rareSealUsers: number;
  readonly latestEventAt: string | null;
}

const createAccumulator = (): EvidenceAccumulator => ({
  noviceEliteUsers: new Set<number>(),
  noviceRewardUsers: new Set<number>(),
  openRunesUsers: new Set<number>(),
  equipSignUsers: new Set<number>(),
  followUpBattleUsers: new Set<number>(),
  rareSealUsers: new Set<number>(),
  latestEventAt: null,
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

const normalizeSchoolCode = (value: unknown): string | null => (
  typeof value === 'string' && trackedSchoolCodes.has(value) ? value : null
);

const updateLatestEventAt = (accumulator: EvidenceAccumulator, createdAt: string | Date): void => {
  const nextValue = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();
  if (!accumulator.latestEventAt || nextValue > accumulator.latestEventAt) {
    accumulator.latestEventAt = nextValue;
  }
};

export const summarizeSchoolPathEvidence = (
  entries: readonly SchoolPathEvidenceLogEntry[],
): readonly SchoolPathEvidenceRow[] => {
  const schoolDefinitions = listSchoolDefinitions().filter((school) => trackedSchoolCodes.has(school.code));
  const accumulators = new Map(schoolDefinitions.map((school) => [school.code, createAccumulator()]));

  for (const entry of entries) {
    const details = parseDetails(entry.details);

    if (entry.action === 'school_novice_elite_encounter_started') {
      const schoolCode = normalizeSchoolCode(details.schoolCode);
      if (!schoolCode) {
        continue;
      }

      const accumulator = accumulators.get(schoolCode)!;
      accumulator.noviceEliteUsers.add(entry.userId);
      updateLatestEventAt(accumulator, entry.createdAt);
      continue;
    }

    if (entry.action === 'school_novice_follow_up_action_taken') {
      const schoolCode = normalizeSchoolCode(details.schoolCode);
      if (!schoolCode) {
        continue;
      }

      const accumulator = accumulators.get(schoolCode)!;
      switch (details.actionType) {
        case 'open_runes':
          accumulator.openRunesUsers.add(entry.userId);
          break;
        case 'equip_school_sign':
          accumulator.equipSignUsers.add(entry.userId);
          break;
        case 'start_next_battle':
          accumulator.followUpBattleUsers.add(entry.userId);
          break;
        default:
          break;
      }

      updateLatestEventAt(accumulator, entry.createdAt);
      continue;
    }

    if (entry.action === 'reward_claim_applied') {
      const noviceSchoolCode = normalizeSchoolCode(details.novicePathSchoolCode);
      const battleSchoolCode = normalizeSchoolCode(details.battleSchoolCode);
      const rewardRuneRarity = typeof details.rewardRuneRarity === 'string' ? details.rewardRuneRarity : null;

      if (details.isSchoolNoviceAligned === true && noviceSchoolCode && details.noviceTargetRewardRarity === 'UNUSUAL') {
        const accumulator = accumulators.get(noviceSchoolCode)!;
        accumulator.noviceRewardUsers.add(entry.userId);
        updateLatestEventAt(accumulator, entry.createdAt);
      }

      if (battleSchoolCode && rewardRuneRarity === 'RARE') {
        const accumulator = accumulators.get(battleSchoolCode)!;
        accumulator.rareSealUsers.add(entry.userId);
        updateLatestEventAt(accumulator, entry.createdAt);
      }
    }
  }

  return schoolDefinitions.map((school) => {
    const accumulator = accumulators.get(school.code)!;
    return {
      schoolCode: school.code,
      schoolName: school.name,
      noviceEliteUsers: accumulator.noviceEliteUsers.size,
      noviceRewardUsers: accumulator.noviceRewardUsers.size,
      openRunesUsers: accumulator.openRunesUsers.size,
      equipSignUsers: accumulator.equipSignUsers.size,
      followUpBattleUsers: accumulator.followUpBattleUsers.size,
      rareSealUsers: accumulator.rareSealUsers.size,
      latestEventAt: accumulator.latestEventAt,
    };
  });
};

export const buildSchoolPathEvidenceMarkdown = (
  rows: readonly SchoolPathEvidenceRow[],
  generatedAt: string,
): string => {
  const header = [
    '# School Path Evidence Summary',
    '',
    `Сгенерировано: ${generatedAt}`,
    '',
    'Метрики показывают **уникальных игроков** по ключевым шагам school-first baseline, а не количество всех сырых событий.',
    '',
    '| Школа | Novice elite | UNUSUAL reward | Open runes | Equip sign | Follow-up battle | RARE seal | Latest event |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  const lines = rows.map((row) => [
    row.schoolName,
    row.noviceEliteUsers,
    row.noviceRewardUsers,
    row.openRunesUsers,
    row.equipSignUsers,
    row.followUpBattleUsers,
    row.rareSealUsers,
    row.latestEventAt ?? '—',
  ].join(' | ')).map((line) => `| ${line} |`);

  const footer = [
    '',
    '## Как читать',
    '',
    '- `Novice elite` — дошёл ли игрок до первого school trial;',
    '- `UNUSUAL reward` — получил ли первый знак школы через aligned reward;',
    '- `Open runes` / `Equip sign` — дошёл ли игрок от награды до реальной установки знака;',
    '- `Follow-up battle` — начал ли следующий meaningful бой после school payoff;',
    '- `RARE seal` — дошёл ли игрок до первого полного раннего seal payoff школы.',
  ];

  return [...header, ...lines, ...footer].join('\n');
};
