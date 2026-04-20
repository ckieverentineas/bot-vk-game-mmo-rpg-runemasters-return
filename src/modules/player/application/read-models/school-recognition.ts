import type { PlayerState } from '../../../../shared/types/game';
import { getEquippedRune } from '../../domain/player-stats';
import {
  findBestRuneOfSchoolAtLeastRarity,
  getSchoolNovicePathDefinition,
  hasRuneOfSchoolAtLeastRarity,
} from '../../domain/school-novice-path';
import { getSchoolDefinitionForArchetype } from '../../../runes/domain/rune-schools';

export interface SchoolRecognitionView {
  readonly schoolCode: string;
  readonly title: string;
  readonly statusLine: string;
  readonly signEquipped: boolean;
}

export const buildPlayerSchoolRecognitionView = (player: PlayerState): SchoolRecognitionView | null => {
  const equippedRune = getEquippedRune(player);
  const school = getSchoolDefinitionForArchetype(equippedRune?.archetypeCode);
  const novicePath = getSchoolNovicePathDefinition(school?.code);

  if (!school || !novicePath || !hasRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.rewardRarity)) {
    return null;
  }

  const bestSchoolSign = findBestRuneOfSchoolAtLeastRarity(player, novicePath.schoolCode, novicePath.rewardRarity);
  const signEquipped = bestSchoolSign?.id === equippedRune?.id;
  const hasSchoolSeal = !!bestSchoolSign && !!novicePath.minibossRewardRarity && bestSchoolSign.rarity === novicePath.minibossRewardRarity;

  if (hasSchoolSeal) {
    switch (novicePath.schoolCode) {
      case 'ember':
        return {
          schoolCode: novicePath.schoolCode,
          title: 'Печать Пламени',
          statusLine: signEquipped
            ? 'Вы уже пережили большой бой Пламени: школа доверила вам печать давления и дожима, а не просто первый знак.'
            : 'Вы уже пережили большой бой Пламени. Печать школы ждёт в рунах — наденьте её, чтобы закрепить следующий ранг стиля.',
          signEquipped,
        };
      case 'stone':
        return {
          schoolCode: novicePath.schoolCode,
          title: 'Печать Тверди',
          statusLine: signEquipped
            ? 'Вы уже пережили большой бой Тверди: школа доверила вам печать выдержки и ответного хода, а не просто первый знак.'
            : 'Вы уже пережили большой бой Тверди. Печать школы ждёт в рунах — наденьте её, чтобы закрепить следующий ранг стиля.',
          signEquipped,
        };
      default:
        return {
          schoolCode: novicePath.schoolCode,
          title: `Печать школы ${school.name}`,
          statusLine: signEquipped
            ? `Вы уже пережили большой бой школы ${school.nameGenitive} и получили её печать.`
            : `Вы уже пережили большой бой школы ${school.nameGenitive}. Печать ждёт, пока вы закрепите её в сборке.`,
          signEquipped,
        };
    }
  }

  switch (novicePath.schoolCode) {
    case 'ember':
      return {
        schoolCode: novicePath.schoolCode,
        title: 'Первый знак Пламени',
        statusLine: signEquipped
          ? 'Вы уже прошли первое испытание Пламени: школа признала вашу решимость и теперь строится вокруг давления и дожима.'
          : 'Вы уже прошли первое испытание Пламени. Первый знак школы ждёт в рунах — наденьте его, чтобы закрепить давление и дожим.',
        signEquipped,
      };
    case 'stone':
      return {
        schoolCode: novicePath.schoolCode,
        title: 'Первый знак Тверди',
        statusLine: signEquipped
          ? 'Вы уже прошли первое испытание Тверди: школа признала вашу стойкость и теперь строится вокруг выдержки и ответного хода.'
          : 'Вы уже прошли первое испытание Тверди. Первый знак школы ждёт в рунах — наденьте его, чтобы закрепить выдержку и ответный ход.',
        signEquipped,
      };
    case 'echo':
      return {
        schoolCode: novicePath.schoolCode,
        title: 'Первый знак Прорицания',
        statusLine: signEquipped
          ? 'Вы уже прошли первое испытание Прорицания: школа признала, что вы умеете читать раскрытую угрозу и отвечать в правильный момент.'
          : 'Вы уже прошли первое испытание Прорицания. Первый знак школы ждёт в рунах — наденьте его, чтобы закрепить чтение угрозы в сборке.',
        signEquipped,
      };
    default:
      return {
        schoolCode: novicePath.schoolCode,
        title: `Первый знак школы ${school.name}`,
        statusLine: signEquipped
          ? `Вы уже прошли первое испытание школы ${school.nameGenitive} и закрепили её путь в сборке.`
          : `Вы уже прошли первое испытание школы ${school.nameGenitive}. Первый знак школы ждёт, пока вы наденете его в сборке.`,
        signEquipped,
      };
  }
};
