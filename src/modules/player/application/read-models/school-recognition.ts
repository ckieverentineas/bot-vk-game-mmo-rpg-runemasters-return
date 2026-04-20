import type { PlayerState } from '../../../../shared/types/game';
import { getEquippedRune } from '../../domain/player-stats';
import { getSchoolNovicePathDefinition, hasRuneOfSchoolAtLeastRarity } from '../../domain/school-novice-path';
import { getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';

export interface SchoolRecognitionView {
  readonly schoolCode: string;
  readonly title: string;
  readonly statusLine: string;
}

export const buildPlayerSchoolRecognitionView = (player: PlayerState): SchoolRecognitionView | null => {
  const equippedRune = getEquippedRune(player);
  const school = getSchoolDefinitionForArchetype(equippedRune?.archetypeCode);
  const novicePath = getSchoolNovicePathDefinition(school?.code);

  if (!school || !novicePath || !hasRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.rewardRarity)) {
    return null;
  }

  switch (novicePath.schoolCode) {
    case 'ember':
      return {
        schoolCode: novicePath.schoolCode,
        title: 'Первый знак Пламени',
        statusLine: 'Вы уже прошли первое испытание Пламени: школа признала вашу решимость и теперь строится вокруг давления и дожима.',
      };
    case 'stone':
      return {
        schoolCode: novicePath.schoolCode,
        title: 'Первый знак Тверди',
        statusLine: 'Вы уже прошли первое испытание Тверди: школа признала вашу стойкость и теперь строится вокруг выдержки и ответного хода.',
      };
    default:
      return {
        schoolCode: novicePath.schoolCode,
        title: `Первый знак школы ${school.name}`,
        statusLine: `Вы уже прошли первое испытание школы ${school.nameGenitive} и закрепили её путь в сборке.`,
      };
  }
};
