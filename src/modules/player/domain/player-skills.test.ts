import { describe, expect, it } from 'vitest';

import type { PlayerSkillPointGain, PlayerSkillView } from '../../../shared/types/game';
import {
  applyPlayerSkillExperience,
  createPlayerSkillView,
  getPlayerSkillDefinition,
  listPlayerSkillCodes,
  listPlayerSkillDefinitions,
  resolveNextPlayerSkillThreshold,
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

  it('includes alchemy as a crafting skill for consumable brewing', () => {
    expect(getPlayerSkillDefinition('crafting.alchemy')).toEqual({
      code: 'crafting.alchemy',
      category: 'crafting',
      title: 'Алхимия',
      description: 'Создание пилюль и зелий из трав, слизи и трофейных материалов.',
    });
  });

  it('includes workshop craft as a crafting skill for equipment quality', () => {
    expect(getPlayerSkillDefinition('crafting.workshop')).toEqual({
      code: 'crafting.workshop',
      category: 'crafting',
      title: 'Мастерство',
      description: 'Работа с чертежами, снаряжением, качеством предметов и ремонтом.',
    });
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
      description: 'Боевые приёмы рун, применённые в нужный миг.',
    });
    expect(getPlayerSkillDefinition('unknown.skill')).toBeNull();
  });

  it('applies skill experience and promotes rank at the first threshold', () => {
    const next = applyPlayerSkillExperience(createPlayerSkillView('gathering.skinning', 99), 'gathering.skinning', 1);

    expect(next).toEqual({
      skillCode: 'gathering.skinning',
      experience: 100,
      rank: 1,
    });
    expect(resolveNextPlayerSkillThreshold(0)).toBe(100);
    expect(resolveNextPlayerSkillThreshold(1)).toBeNull();
  });
});
