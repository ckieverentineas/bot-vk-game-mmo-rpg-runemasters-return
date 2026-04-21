import type { BattleView, PlayerState } from '../../../../shared/types/game';
import {
  findBestRuneOfSchoolAtLeastRarity,
  getSchoolNovicePathDefinition,
  hasRuneOfSchoolAtLeastRarity,
} from '../../domain/school-novice-path';
import { describeRuneContent } from '../../../runes/domain/rune-abilities';
import { getRuneSchoolPresentation, getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';
import { getEquippedRune, getRuneEquippedSlot, getSelectedRune, getUnlockedRuneSlotCount } from '../../domain/player-stats';
import {
  getPlayerSchoolMasteryForArchetype,
  getSchoolMasteryDefinition,
  resolveNextSchoolMasteryThreshold,
} from '../../domain/school-mastery';

export type NextGoalType =
  | 'complete_tutorial_battle'
  | 'get_first_rune'
  | 'equip_first_rune'
  | 'use_active_rune_skill'
  | 'hunt_school_elite'
  | 'equip_school_sign'
  | 'challenge_school_miniboss'
  | 'reach_next_school_mastery'
  | 'fill_support_slot'
  | 'push_higher_threat'
  | 'equip_dropped_rune'
  | 'review_runes_after_defeat';

export type NextGoalPrimaryAction = 'tutorial_battle' | 'explore' | 'open_runes';

export interface NextGoalView {
  readonly goalType: NextGoalType;
  readonly primaryAction: NextGoalPrimaryAction;
  readonly primaryActionLabel: string;
  readonly objectiveText: string;
  readonly whyText: string | null;
  readonly schoolCode: string | null;
  readonly schoolName: string | null;
  readonly milestoneTitle: string | null;
  readonly milestoneProgressText: string | null;
  readonly milestoneBenefitText: string | null;
}

const resolvePrimaryActionLabel = (action: NextGoalPrimaryAction): string => {
  switch (action) {
    case 'tutorial_battle':
      return '⚔️ Учебный бой';
    case 'open_runes':
      return '🔮 Руны';
    case 'explore':
    default:
      return '⚔️ Исследовать';
  }
};

const formatVictoryWord = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'победу';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'победы';
  }

  return 'побед';
};

const createGoalView = (
  goalType: NextGoalType,
  primaryAction: NextGoalPrimaryAction,
  objectiveText: string,
  options: Partial<Omit<NextGoalView, 'goalType' | 'primaryAction' | 'objectiveText'>> = {},
): NextGoalView => ({
  goalType,
  primaryAction,
  primaryActionLabel: options.primaryActionLabel ?? resolvePrimaryActionLabel(primaryAction),
  objectiveText,
  whyText: options.whyText ?? null,
  schoolCode: options.schoolCode ?? null,
  schoolName: options.schoolName ?? null,
  milestoneTitle: options.milestoneTitle ?? null,
  milestoneProgressText: options.milestoneProgressText ?? null,
  milestoneBenefitText: options.milestoneBenefitText ?? null,
});

export const buildPlayerNextGoalView = (player: PlayerState): NextGoalView => {
  if (player.tutorialState === 'ACTIVE') {
    return createGoalView(
      'complete_tutorial_battle',
      'tutorial_battle',
      'пройдите учебный бой, заберите первую боевую руну и откройте свою школу рун',
      {
        whyText: 'После этого первая школа рун задаст ваш ранний стиль боя.',
      },
    );
  }

  if (player.runes.length === 0) {
    return createGoalView(
      'get_first_rune',
      'explore',
      'получите первую руну, чтобы открыть школу рун и новый стиль боя',
      {
        whyText: 'Первая руна открывает узнаваемый стиль боя, а не просто ещё одни цифры.',
      },
    );
  }

  const equippedRune = getEquippedRune(player);
  const selectedRune = getSelectedRune(player);
  const selectedSchool = getRuneSchoolPresentation(selectedRune?.archetypeCode);
  const selectedSchoolDefinition = getSchoolDefinitionForArchetype(selectedRune?.archetypeCode);
  if (!equippedRune) {
    return createGoalView(
      'equip_first_rune',
      'open_runes',
      'откройте «🔮 Руны» и наденьте руну перед следующим боем',
      {
        schoolCode: selectedSchoolDefinition?.code ?? null,
        schoolName: selectedSchool?.name ?? null,
        whyText: selectedSchool
          ? `Так школа ${selectedSchoolDefinition?.nameGenitive ?? selectedSchool.name} станет вашей реальной боевой сборкой.`
          : 'Так школа рун перейдёт из коллекции в реальный стиль боя.',
      },
    );
  }

  const equippedSchool = getRuneSchoolPresentation(equippedRune.archetypeCode);
  const schoolDefinition = getSchoolDefinitionForArchetype(equippedRune.archetypeCode);
  const novicePath = schoolDefinition ? getSchoolNovicePathDefinition(schoolDefinition.code) : null;
  const shouldFocusActiveSkill = describeRuneContent(equippedRune).activeAbilities.length > 0
    && (player.victories === 0 || (player.victories <= 2 && !novicePath));
  if (shouldFocusActiveSkill) {
    return createGoalView(
      'use_active_rune_skill',
      'explore',
      'войдите в бой и примените активное действие экипированной руны',
      {
        schoolCode: schoolDefinition?.code ?? null,
        schoolName: equippedSchool?.name ?? null,
        whyText: equippedSchool
          ? `${equippedSchool.name} начнёт ощущаться через свой особый боевой приём, а не только через пассивный бонус.`
          : 'Так руна начнёт менять бой не только статами, но и решением по ходу боя.',
      },
    );
  }

  if (
    novicePath
    && schoolDefinition
    && !hasRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.rewardRarity)
  ) {
    return createGoalView(
      'hunt_school_elite',
      'explore',
      `разыщите ${novicePath.enemyNameAccusative} в ${novicePath.biomeName} и пройдите первое испытание школы ${schoolDefinition.nameGenitive}`,
      {
        schoolCode: novicePath.schoolCode,
        schoolName: equippedSchool?.name ?? schoolDefinition.name,
        whyText: `За победу школа ${schoolDefinition.nameGenitive} может сразу дать первую ${novicePath.rewardRarity === 'UNUSUAL' ? 'необычную' : 'новую'} руну этой школы, если этой вехи у вас ещё нет.`,
        milestoneTitle: `Первое испытание школы ${schoolDefinition.nameGenitive}`,
        milestoneProgressText: `${novicePath.biomeName} · ${novicePath.enemyName}`,
        milestoneBenefitText: `Победа может принести первую ${novicePath.rewardRarity === 'UNUSUAL' ? 'необычную' : 'новую'} руну школы ${schoolDefinition.nameGenitive}.`,
      },
    );
  }

  if (novicePath && schoolDefinition) {
    const bestSchoolSign = findBestRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.rewardRarity);
    const bestSchoolSignEquipped = bestSchoolSign ? getRuneEquippedSlot(bestSchoolSign) !== null : false;
    if (bestSchoolSign && !bestSchoolSignEquipped) {
      const signNameLabel = novicePath.minibossRewardRarity && bestSchoolSign.rarity === novicePath.minibossRewardRarity
        ? 'печать школы'
        : 'первый знак школы';
      return createGoalView(
        'equip_school_sign',
        'open_runes',
        `откройте «🔮 Руны» и наденьте ${signNameLabel} ${schoolDefinition.nameGenitive}`,
        {
          schoolCode: novicePath.schoolCode,
          schoolName: equippedSchool?.name ?? schoolDefinition.name,
          whyText: novicePath.minibossRewardRarity && bestSchoolSign.rarity === novicePath.minibossRewardRarity
            ? `Так большой бой школы ${schoolDefinition.nameGenitive} перейдёт из редкой награды в реальную боевую сборку.`
            : `Так первое признание школы ${schoolDefinition.nameGenitive} перейдёт из награды в реальную боевую сборку.`,
          milestoneTitle: novicePath.minibossRewardRarity && bestSchoolSign.rarity === novicePath.minibossRewardRarity
            ? `Печать школы ${schoolDefinition.nameGenitive}`
            : `Первый знак школы ${schoolDefinition.nameGenitive}`,
          milestoneProgressText: `«${bestSchoolSign.name}» уже ждёт в коллекции рун.`,
          milestoneBenefitText: `Наденьте «${bestSchoolSign.name}», чтобы следующий бой уже шёл через новый знак школы.`,
        },
      );
    }

    if (
      bestSchoolSign
      && novicePath.minibossEnemyName
      && novicePath.minibossEnemyNameAccusative
      && novicePath.minibossRewardRarity
      && bestSchoolSignEquipped
      && !hasRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.minibossRewardRarity)
    ) {
      return createGoalView(
        'challenge_school_miniboss',
        'explore',
        `разыщите ${novicePath.minibossEnemyNameAccusative} в ${novicePath.biomeName} и пройдите большой бой школы ${schoolDefinition.nameGenitive}`,
        {
          schoolCode: novicePath.schoolCode,
          schoolName: equippedSchool?.name ?? schoolDefinition.name,
          whyText: `Этот бой проверяет, стал ли первый знак школы ${schoolDefinition.nameGenitive} реальной боевой сборкой, а не просто редкой наградой.`,
          milestoneTitle: `Большой бой школы ${schoolDefinition.nameGenitive}`,
          milestoneProgressText: `${novicePath.biomeName} · ${novicePath.minibossEnemyName}`,
          milestoneBenefitText: `Победа может принести первую ${novicePath.minibossRewardRarity === 'RARE' ? 'редкую' : 'новую'} руну школы ${schoolDefinition.nameGenitive}.`,
        },
      );
    }
  }

  const mastery = getPlayerSchoolMasteryForArchetype(player, equippedRune.archetypeCode);
  const masteryDefinition = getSchoolMasteryDefinition(mastery?.schoolCode ?? null);
  const nextThreshold = resolveNextSchoolMasteryThreshold(mastery?.rank ?? 0);
  const nextUnlock = masteryDefinition?.unlocks.find((entry) => entry.rank === (mastery?.rank ?? 0) + 1) ?? null;
  if (mastery && schoolDefinition && nextThreshold !== null && nextUnlock) {
    const remainingVictories = Math.max(1, nextThreshold - mastery.experience);
    return createGoalView(
      'reach_next_school_mastery',
      'explore',
      `одержите ещё ${remainingVictories} ${formatVictoryWord(remainingVictories)} школой ${schoolDefinition.nameGenitive}, чтобы открыть «${nextUnlock.title}»`,
      {
        schoolCode: mastery.schoolCode,
        schoolName: equippedSchool?.name ?? schoolDefinition.name,
        whyText: nextUnlock.description,
        milestoneTitle: nextUnlock.title,
        milestoneProgressText: `${mastery.experience}/${nextThreshold} до «${nextUnlock.title}»`,
        milestoneBenefitText: nextUnlock.description,
      },
    );
  }

  if (getUnlockedRuneSlotCount(player) > 1 && !getEquippedRune(player, 1)) {
    return createGoalView(
      'fill_support_slot',
      'open_runes',
      'откройте «🔮 Руны» и наденьте вторую руну в свободный слот',
      {
        schoolCode: schoolDefinition?.code ?? null,
        schoolName: equippedSchool?.name ?? null,
        whyText: 'Каждая надетая руна работает полностью: статы, пассивы и активное действие в бою.',
        milestoneTitle: 'Свободный слот рун',
        milestoneProgressText: 'Второй слот рун уже открыт.',
        milestoneBenefitText: 'Вторая руна добавит полные статы, пассивы и свою боевую кнопку, если у неё есть активное действие.',
      },
    );
  }

  return createGoalView(
    'push_higher_threat',
    'explore',
    'усиливайте руну и пробуйте более высокий уровень угрозы дальше',
    {
      schoolCode: schoolDefinition?.code ?? null,
      schoolName: equippedSchool?.name ?? null,
      whyText: 'Так вы продолжите развивать текущую школу и расширять сборку через честные короткие сессии.',
    },
  );
};

export const buildBattleResultNextGoalView = (
  battle: BattleView,
  player?: PlayerState,
): NextGoalView | null => {
  if (battle.status !== 'COMPLETED') {
    return null;
  }

  if (battle.result === 'VICTORY' && battle.rewards?.droppedRune) {
    return createGoalView(
      'equip_dropped_rune',
      'open_runes',
      'откройте «🔮 Руны» и наденьте новую руну',
      {
        schoolCode: getSchoolDefinitionForArchetype(battle.rewards.droppedRune.archetypeCode)?.code ?? null,
        schoolName: getRuneSchoolPresentation(battle.rewards.droppedRune.archetypeCode)?.name ?? null,
        whyText: 'Так вы усилите стиль боя перед следующим боем.',
      },
    );
  }

  if (battle.result === 'DEFEAT') {
    return createGoalView(
      'review_runes_after_defeat',
      'open_runes',
      'проверьте «🔮 Руны» и текущую школу или спокойно продолжите исследование снова',
      {
        whyText: 'Так вы спокойнее подготовитесь к следующей встрече без лишнего давления.',
      },
    );
  }

  if (!player) {
    return createGoalView(
      'push_higher_threat',
      'explore',
      'исследуйте маршрут дальше и продолжайте усиливать сборку',
      {
        whyText: 'Сейчас полезнее искать следующую полезную руну и расширять сборку.',
      },
    );
  }

  return buildPlayerNextGoalView(player);
};
