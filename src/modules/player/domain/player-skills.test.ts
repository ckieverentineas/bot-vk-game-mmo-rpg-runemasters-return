import { describe, expect, it } from 'vitest';

import type { PlayerSkillPointGain, PlayerSkillView } from '../../../shared/types/game';
import {
  getPlayerSkillDefinition,
  listPlayerSkillCodes,
  listPlayerSkillDefinitions,
} from './player-skills';

describe('player skills', () => {
  it('models a persisted player skill and an action skill gain with the same shared code type', () => {
    const skill: PlayerSkillView = {
      skillCode: 'gathering.skinning',
      experience: 12,
      rank: 0,
    };
    const gain: PlayerSkillPointGain = {
      skillCode: 'gathering.skinning',
      points: 1,
    };

    expect(skill.skillCode).toBe(gain.skillCode);
  });

  it('lists the initial gathering skill definitions used by trophy actions', () => {
    const gatheringDefinitions = listPlayerSkillDefinitions()
      .filter((definition) => definition.category === 'gathering')
      .map((definition) => definition.code);

    expect(gatheringDefinitions).toEqual([
      'gathering.skinning',
      'gathering.reagent_gathering',
      'gathering.essence_extraction',
    ]);
  });

  it('keeps player skill codes unique', () => {
    const codes = listPlayerSkillCodes();
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('finds known skill definitions and rejects unknown codes', () => {
    expect(getPlayerSkillDefinition('rune.active_use')).toEqual({
      code: 'rune.active_use',
      category: 'rune',
      title: 'Активные руны',
      description: 'Практика боевого применения активных рунных навыков.',
    });
    expect(getPlayerSkillDefinition('unknown.skill')).toBeNull();
  });
});
