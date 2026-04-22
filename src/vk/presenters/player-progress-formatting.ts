import { getEquippedRune } from '../../modules/player/domain/player-stats';
import {
  getPlayerSchoolMasteryForArchetype,
  getSchoolMasteryDefinition,
  resolveNextSchoolMasteryThreshold,
} from '../../modules/player/domain/school-mastery';
import { getRuneSchoolPresentation } from '../../modules/runes/domain/rune-schools';
import type { PlayerState } from '../../shared/types/game';

export const renderSchoolMasteryLine = (player: PlayerState): string => {
  if (player.runes.length === 0) {
    return 'Мастерство школы: откроется после первой боевой руны.';
  }

  const equippedRune = getEquippedRune(player);
  const equippedSchool = getRuneSchoolPresentation(equippedRune?.archetypeCode);
  const mastery = getPlayerSchoolMasteryForArchetype(player, equippedRune?.archetypeCode);
  if (!equippedRune || !equippedSchool || !mastery) {
    return 'Мастерство школы: наденьте руну, чтобы начать путь конкретной школы.';
  }

  const definition = getSchoolMasteryDefinition(mastery.schoolCode);
  const nextThreshold = resolveNextSchoolMasteryThreshold(mastery.rank);
  const nextUnlock = definition?.unlocks.find((entry) => entry.rank === mastery.rank + 1) ?? null;
  const currentUnlock = definition?.unlocks.find((entry) => entry.rank === mastery.rank) ?? null;

  if (nextThreshold === null) {
    const currentUnlockPart = currentUnlock
      ? ` · открыто: ${currentUnlock.title}.`
      : '.';

    return `Мастерство школы: ${equippedSchool.name} · ранг ${mastery.rank}${currentUnlockPart}`;
  }

  const nextUnlockTitle = nextUnlock?.title ?? 'новой вехи';

  return [
    `Мастерство школы: ${equippedSchool.name}`,
    `ранг ${mastery.rank}`,
    `${mastery.experience}/${nextThreshold} до «${nextUnlockTitle}».`,
  ].join(' · ');
};
