import type { BattleView, PlayerState } from '../../../../shared/types/game';
import { buildAntiStallRecoveryView } from '../../domain/anti-stall-recovery';
import {
  findBestRuneOfSchoolAtLeastRarity,
  getSchoolNovicePathDefinition,
  getSchoolNovicePathDefinitionForEnemy,
  hasEquippedRuneOfSchoolAtLeastRarity,
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
  | 'prove_school_seal'
  | 'reach_next_school_mastery'
  | 'fill_rune_slot'
  | 'push_higher_threat'
  | 'equip_dropped_rune'
  | 'review_runes_after_defeat'
  | 'recover_before_fight';

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

const resolveSealGoalBenefitText = (schoolCode: string, nextUnlockDescription: string): string => {
  switch (schoolCode) {
    case 'ember':
      return `Печать уже даёт +1 к давлению базовой атаки; следующий ранг закрепит это как путь давления. ${nextUnlockDescription}`;
    case 'stone':
      return `Печать уже даёт +1 guard к защитной стойке и «Каменному отпору»; следующий ранг закрепит это как путь опоры. ${nextUnlockDescription}`;
    case 'gale':
      return `Печать уже даёт +1 guard к «Шагу шквала»; следующий ранг закрепит это как путь темпа. ${nextUnlockDescription}`;
    case 'echo':
      return `Печать уже даёт +1 к точному ответу по раскрытому intent; следующий ранг закрепит это как путь чтения. ${nextUnlockDescription}`;
    default:
      return `Печать уже даёт малый боевой бонус школы; следующий ранг закрепит этот стиль. ${nextUnlockDescription}`;
  }
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
  const antiStallRecovery = buildAntiStallRecoveryView(player);
  if (antiStallRecovery?.shouldReviewRunes) {
    return createGoalView(
      'review_runes_after_defeat',
      'open_runes',
      'откройте «🔮 Руны» и наденьте свободную руну перед осторожным выходом',
      {
        schoolCode: schoolDefinition?.code ?? null,
        schoolName: equippedSchool?.name ?? null,
        whyText: antiStallRecovery.reason === 'LOW_HEALTH'
          ? 'Вы ранены: лишний знак в сборке безопаснее, чем сразу снова давить маршрут силой.'
          : 'После серии поражений лучше сначала закрыть свободный слот, а уже потом идти к лёгкой встрече.',
      },
    );
  }

  if (antiStallRecovery) {
    return createGoalView(
      'recover_before_fight',
      'explore',
      antiStallRecovery.reason === 'LOW_HEALTH'
        ? 'найдите передышку: маршрут сначала поднимет HP/ману или даст очень лёгкую встречу'
        : 'вернитесь через осторожную встречу: маршрут временно уберёт тяжёлые цели и даст более мягкий бой',
      {
        primaryActionLabel: antiStallRecovery.reason === 'LOW_HEALTH'
          ? '🌿 Передышка'
          : '⚔️ Осторожно дальше',
        schoolCode: schoolDefinition?.code ?? null,
        schoolName: equippedSchool?.name ?? null,
        whyText: antiStallRecovery.reason === 'LOW_HEALTH'
          ? 'Низкое HP не должно превращать маршрут в тупик: сначала восстановление, потом обычный темп.'
          : 'Серия поражений временно включает мягкий маршрут без школьных испытаний и верхних угроз.',
      },
    );
  }

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
  const sealEquipped = !!(
    novicePath
    && schoolDefinition
    && novicePath.minibossRewardRarity
    && hasEquippedRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.minibossRewardRarity)
  );
  if (sealEquipped && mastery && schoolDefinition && nextThreshold !== null && nextUnlock) {
    const remainingVictories = Math.max(1, nextThreshold - mastery.experience);
    return createGoalView(
      'prove_school_seal',
      'explore',
      `проверьте печать школы ${schoolDefinition.nameGenitive} на цели печати: одержите ещё ${remainingVictories} ${formatVictoryWord(remainingVictories)}, чтобы открыть «${nextUnlock.title}»`,
      {
        primaryActionLabel: '⚔️ Цель печати',
        schoolCode: mastery.schoolCode,
        schoolName: equippedSchool?.name ?? schoolDefinition.name,
        whyText: resolveSealGoalBenefitText(mastery.schoolCode, nextUnlock.description),
        milestoneTitle: `Следующий ранг школы ${schoolDefinition.nameGenitive}`,
        milestoneProgressText: `${mastery.experience}/${nextThreshold} до «${nextUnlock.title}»`,
        milestoneBenefitText: nextUnlock.description,
      },
    );
  }

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
      'fill_rune_slot',
      'open_runes',
      'откройте «🔮 Руны» и наденьте вторую руну в свободный слот',
      {
        schoolCode: schoolDefinition?.code ?? null,
        schoolName: equippedSchool?.name ?? null,
        whyText: 'Каждая надетая руна работает полностью: боевые черты, пассивы и активное действие в бою.',
        milestoneTitle: 'Свободный слот рун',
        milestoneProgressText: 'Второй слот рун уже открыт.',
        milestoneBenefitText: 'Вторая руна добавит полные боевые черты, пассивы и свой приём, если он у неё есть.',
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

export const resolveNextGoalRuneFocusIndex = (player: PlayerState): number | null => {
  const nextGoal = buildPlayerNextGoalView(player);
  if (nextGoal.goalType !== 'equip_school_sign' || !nextGoal.schoolCode) {
    return null;
  }

  const novicePath = getSchoolNovicePathDefinition(nextGoal.schoolCode);
  if (!novicePath) {
    return null;
  }

  const rune = findBestRuneOfSchoolAtLeastRarity(
    player,
    novicePath.schoolCode,
    novicePath.rewardRarity,
  );
  if (!rune) {
    return null;
  }

  const runeIndex = player.runes.findIndex((entry) => entry.id === rune.id);
  return runeIndex >= 0 ? runeIndex : null;
};

export const buildBattleResultNextGoalView = (
  battle: BattleView,
  player?: PlayerState,
): NextGoalView | null => {
  if (battle.status !== 'COMPLETED') {
    return null;
  }

  if (battle.result === 'VICTORY' && battle.rewards?.droppedRune) {
    const novicePath = getSchoolNovicePathDefinitionForEnemy(battle.enemy.code);
    const droppedRuneSchoolCode = getSchoolDefinitionForArchetype(battle.rewards.droppedRune.archetypeCode)?.code ?? null;
    const droppedRuneRarity = battle.rewards.droppedRune.rarity;
    const requiredRarity = novicePath?.minibossEnemyCode === battle.enemy.code
      ? novicePath.minibossRewardRarity
      : novicePath?.rewardRarity;
    const isSchoolPathReward = player
      && novicePath
      && requiredRarity
      && droppedRuneSchoolCode === novicePath.schoolCode
      && droppedRuneRarity === requiredRarity;

    if (isSchoolPathReward) {
      return buildPlayerNextGoalView(player);
    }

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
      'проверьте «🔮 Руны», затем вернитесь через осторожную встречу',
      {
        whyText: 'Поражение не забирает сборку: руны и прогресс остаются, а следующий поиск будет мягче.',
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
