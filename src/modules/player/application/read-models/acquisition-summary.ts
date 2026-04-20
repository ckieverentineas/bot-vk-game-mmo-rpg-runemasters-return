import type { BattleView, PlayerState, RuneRarity, RuneView } from '../../../../shared/types/game';
import { describeRuneContent } from '../../../runes/domain/rune-abilities';
import { getSchoolDefinition, getSchoolDefinitionForArchetype, getRuneSchoolPresentation } from '../../../runes/domain/rune-schools';
import { getUnlockedRuneSlotCount } from '../../domain/player-stats';
import { getSchoolNovicePathDefinitionForEnemy, hasRuneOfSchoolAtLeastRarity } from '../../domain/school-novice-path';
import { getSchoolMasteryDefinition } from '../../domain/school-mastery';

export type AcquisitionSummaryKind = 'new_rune' | 'new_rarity' | 'mastery_unlock' | 'slot_unlock' | 'school_trial_completed' | 'school_miniboss_completed';

export interface AcquisitionSummaryView {
  readonly kind: AcquisitionSummaryKind;
  readonly title: string;
  readonly changeLine: string;
  readonly nextStepLine: string | null;
}

const rarityOrder: readonly RuneRarity[] = ['USUAL', 'UNUSUAL', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'];

const rarityNameMap: Record<RuneRarity, string> = {
  USUAL: 'обычная',
  UNUSUAL: 'необычная',
  RARE: 'редкая',
  EPIC: 'эпическая',
  LEGENDARY: 'легендарная',
  MYTHICAL: 'мифическая',
};

const createSummary = (
  kind: AcquisitionSummaryKind,
  title: string,
  changeLine: string,
  nextStepLine: string | null,
): AcquisitionSummaryView => ({
  kind,
  title,
  changeLine,
  nextStepLine,
});

const collectRuneIds = (player: Pick<PlayerState, 'runes'>): Set<string> => new Set(player.runes.map((rune) => rune.id));

const resolveAddedRune = (
  before: Pick<PlayerState, 'runes'>,
  after: Pick<PlayerState, 'runes'>,
): RuneView | null => {
  const beforeIds = collectRuneIds(before);
  return after.runes.find((rune) => !beforeIds.has(rune.id)) ?? null;
};

const collectRarities = (player: Pick<PlayerState, 'runes'>): Set<RuneRarity> => new Set(player.runes.map((rune) => rune.rarity));

const resolveNewRarity = (
  before: Pick<PlayerState, 'runes'>,
  after: Pick<PlayerState, 'runes'>,
): RuneRarity | null => {
  const beforeRarities = collectRarities(before);
  const afterRarities = collectRarities(after);

  for (const rarity of [...rarityOrder].reverse()) {
    if (afterRarities.has(rarity) && !beforeRarities.has(rarity)) {
      return rarity;
    }
  }

  return null;
};

const resolveMasteryUnlock = (
  before: Pick<PlayerState, 'schoolMasteries'>,
  after: Pick<PlayerState, 'schoolMasteries'>,
): { schoolCode: string; title: string; description: string } | null => {
  const beforeRanks = new Map((before.schoolMasteries ?? []).map((entry) => [entry.schoolCode, entry.rank]));

  for (const entry of after.schoolMasteries ?? []) {
    const previousRank = beforeRanks.get(entry.schoolCode) ?? 0;
    if (entry.rank <= previousRank) {
      continue;
    }

    const definition = getSchoolMasteryDefinition(entry.schoolCode);
    const unlock = definition?.unlocks.find((candidate) => candidate.rank === entry.rank) ?? null;
    if (!unlock) {
      continue;
    }

    return {
      schoolCode: entry.schoolCode,
      title: unlock.title,
      description: unlock.description,
    };
  }

  return null;
};

const buildNewRaritySummary = (rarity: RuneRarity): AcquisitionSummaryView => createSummary(
  'new_rarity',
  `Новая редкость: ${rarityNameMap[rarity]} руна`,
  `${rarityNameMap[rarity][0].toUpperCase()}${rarityNameMap[rarity].slice(1)} редкость расширяет сборку и чаще даёт более выраженный боевой payoff, а не просто ещё немного статов.`,
  'Откройте «🔮 Руны» и проверьте, как новая редкость меняет вашу сборку.',
);

const buildNewRuneSummary = (
  rune: RuneView,
  before: Pick<PlayerState, 'runes'>,
  newRarity: RuneRarity | null,
): AcquisitionSummaryView => {
  const school = getRuneSchoolPresentation(rune.archetypeCode);
  const schoolDefinition = getSchoolDefinitionForArchetype(rune.archetypeCode);
  const activeAbility = describeRuneContent(rune).activeAbilities[0] ?? null;
  const firstRune = before.runes.length === 0;

  const title = firstRune
    ? `Первая руна: ${rune.name}`
    : `Новая руна: ${rune.name}`;

  const changeLine = firstRune
    ? school
      ? `Она открывает школу ${schoolDefinition?.nameGenitive ?? school.name}. ${school.playPatternLine}`
      : 'Она открывает первую школу рун и новый стиль боя.'
    : activeAbility && school
      ? `Даёт школе ${schoolDefinition?.nameGenitive ?? school.name} новый боевой ход «${activeAbility.name}».${newRarity ? ` Это ваша первая ${rarityNameMap[newRarity]} руна.` : ''}`
      : school
        ? `${school.battleLine}${newRarity ? ` Это ваша первая ${rarityNameMap[newRarity]} руна.` : ''}`
        : newRarity
          ? `Это ваша первая ${rarityNameMap[newRarity]} руна: новая редкость расширяет сборку, а не только цифры.`
          : 'Руна даёт новый боевой инструмент и расширяет варианты сборки.';

  const nextStepLine = firstRune
    ? 'Откройте «🔮 Руны», экипируйте её и зайдите в бой.'
    : 'Откройте «🔮 Руны» и примерьте её в текущей сборке.';

  return createSummary('new_rune', title, changeLine, nextStepLine);
};

const buildMasteryUnlockSummary = (
  unlock: { schoolCode: string; title: string; description: string },
): AcquisitionSummaryView => {
  const school = getSchoolDefinition(unlock.schoolCode);
  const schoolName = school?.name ?? 'школы';

  return createSummary(
    'mastery_unlock',
    `Новая school-веха: «${unlock.title}»`,
    `${schoolName} получила новый payoff: ${unlock.description}`,
    `Зайдите в следующий бой и проверьте новый эффект школы ${schoolName}.`,
  );
};

const buildSlotUnlockSummary = (
  masteryUnlock: { schoolCode: string; title: string; description: string } | null,
): AcquisitionSummaryView => {
  const schoolName = masteryUnlock
    ? getSchoolDefinition(masteryUnlock.schoolCode)?.name ?? null
    : null;

  return createSummary(
    'slot_unlock',
    'Открыт слот поддержки',
    masteryUnlock && schoolName
      ? `${schoolName} вышла на новую веху «${masteryUnlock.title}»: теперь сборку можно усилить поддержкой без второй боевой кнопки.`
      : 'Сборка стала шире: теперь можно усилить школу второй руной поддержки без второй боевой кнопки.',
    'Откройте «🔮 Руны» и поставьте руну поддержки.',
  );
};

const buildSchoolTrialCompletedSummary = (
  schoolCode: string,
  schoolName: string,
  schoolNameGenitive: string,
): AcquisitionSummaryView => {
  switch (schoolCode) {
    case 'ember':
      return createSummary(
        'school_trial_completed',
        'Испытание школы пройдено',
        'Пламя признало вашу решимость. Теперь школа отвечает вам не только давлением, но и настоящим стилем боя через первую необычную руну.',
        'Откройте «🔮 Руны», наденьте первый знак школы и закрепите стиль в следующем бою.',
      );
    case 'stone':
      return createSummary(
        'school_trial_completed',
        'Испытание школы пройдено',
        'Твердь признала вашу стойкость. Теперь школа отвечает вам не только защитой, но и настоящим стилем боя через первую необычную руну.',
        'Откройте «🔮 Руны», наденьте первый знак школы и проверьте новый ответ на тяжёлый удар.',
      );
    case 'echo':
      return createSummary(
        'school_trial_completed',
        'Испытание школы пройдено',
        'Прорицание признало, что вы умеете читать раскрытую угрозу. Теперь школа отвечает вам не только подсказкой, но и настоящим стилем боя через первую необычную руну.',
        'Откройте «🔮 Руны», наденьте первый знак школы и проверьте его на следующем телеграфе врага.',
      );
    case 'gale':
      return createSummary(
        'school_trial_completed',
        'Испытание школы пройдено',
        'Буря признала, что вы умеете не только ударить, но и удержать темп. Теперь школа отвечает вам первой необычной руной.',
        'Откройте «🔮 Руны», наденьте первый знак школы и проверьте его в следующем быстром бою.',
      );
    default:
      return createSummary(
        'school_trial_completed',
        'Испытание школы пройдено',
        `${schoolName} признала ваш первый настоящий шаг. Теперь путь школы ${schoolNameGenitive} закреплён первой необычной руной.`,
        'Откройте «🔮 Руны» и закрепите новый знак школы в сборке.',
      );
  }
};

const buildSchoolMinibossCompletedSummary = (
  schoolCode: string,
  schoolName: string,
  schoolNameGenitive: string,
): AcquisitionSummaryView => {
  switch (schoolCode) {
    case 'ember':
      return createSummary(
        'school_miniboss_completed',
        'Большой бой школы пройден',
        'Пламя признало, что вы выдержали большой бой школы. Теперь редкая руна — это уже не первый знак, а печать вашего стиля.',
        'Откройте «🔮 Руны», наденьте новую печать школы и проверьте её в следующем бою.',
      );
    case 'stone':
      return createSummary(
        'school_miniboss_completed',
        'Большой бой школы пройден',
        'Твердь признала, что вы выдержали большой бой школы. Теперь редкая руна — это уже не первый знак, а печать вашей стойкости.',
        'Откройте «🔮 Руны», наденьте новую печать школы и проверьте её в следующем бою.',
      );
    default:
      return createSummary(
        'school_miniboss_completed',
        'Большой бой школы пройден',
        `${schoolName} признала, что вы выдержали большой бой школы ${schoolNameGenitive}. Теперь редкая руна стала печатью этого пути.`,
        'Откройте «🔮 Руны» и закрепите новую печать школы в сборке.',
      );
  }
};

export const buildBattleAcquisitionSummary = (
  before: PlayerState,
  after: PlayerState,
  battle: BattleView,
): AcquisitionSummaryView | null => {
  if (battle.status !== 'COMPLETED' || battle.result !== 'VICTORY') {
    return null;
  }

  const masteryUnlock = resolveMasteryUnlock(before, after);
  if (getUnlockedRuneSlotCount(after) > getUnlockedRuneSlotCount(before)) {
    return buildSlotUnlockSummary(masteryUnlock);
  }

  if (masteryUnlock) {
    return buildMasteryUnlockSummary(masteryUnlock);
  }

  const addedRune = resolveAddedRune(before, after);
  const newRarity = resolveNewRarity(before, after);
  if (addedRune) {
    const novicePath = getSchoolNovicePathDefinitionForEnemy(battle.enemy.code);
    const addedRuneSchool = getSchoolDefinitionForArchetype(addedRune.archetypeCode);
    if (
      novicePath
      && addedRuneSchool?.code === novicePath.schoolCode
      && novicePath.minibossRewardRarity
      && addedRune.rarity === novicePath.minibossRewardRarity
      && !hasRuneOfSchoolAtLeastRarity(before, novicePath.schoolCode, novicePath.minibossRewardRarity)
    ) {
      return buildSchoolMinibossCompletedSummary(
        novicePath.schoolCode,
        addedRuneSchool.name,
        addedRuneSchool.nameGenitive,
      );
    }

    if (
      novicePath
      && addedRuneSchool?.code === novicePath.schoolCode
      && addedRune.rarity === novicePath.rewardRarity
      && !hasRuneOfSchoolAtLeastRarity(before, novicePath.schoolCode, novicePath.rewardRarity)
    ) {
      return buildSchoolTrialCompletedSummary(
        novicePath.schoolCode,
        addedRuneSchool.name,
        addedRuneSchool.nameGenitive,
      );
    }

    return buildNewRuneSummary(addedRune, before, newRarity);
  }

  if (newRarity) {
    return buildNewRaritySummary(newRarity);
  }

  return null;
};

export const buildCraftAcquisitionSummary = (
  before: PlayerState,
  after: PlayerState,
): AcquisitionSummaryView | null => {
  const addedRune = resolveAddedRune(before, after);
  const newRarity = resolveNewRarity(before, after);

  if (addedRune) {
    return buildNewRuneSummary(addedRune, before, newRarity);
  }

  if (newRarity) {
    return buildNewRaritySummary(newRarity);
  }

  return null;
};
