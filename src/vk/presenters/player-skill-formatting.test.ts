import { describe, expect, it } from 'vitest';

import {
  formatPlayerSkillGainLine,
  formatPlayerSkillProgressLine,
  formatPlayerSkillTitles,
} from './player-skill-formatting';

describe('player skill formatting', () => {
  it('formats profile skill progress with rank copy', () => {
    expect(formatPlayerSkillProgressLine({
      skillCode: 'gathering.skinning',
      experience: 100,
      rank: 1,
    })).toBe('Свежевание: Практик свежевания · ранг закреплён');

    expect(formatPlayerSkillProgressLine({
      skillCode: 'gathering.essence_extraction',
      experience: 1,
      rank: 0,
    })).toBe('Извлечение эссенции: Новичок извлечения эссенции · первые успехи');
  });

  it('formats trophy skill gains as qualitative progress instead of raw numbers', () => {
    expect(formatPlayerSkillGainLine({
      skillCode: 'gathering.skinning',
      experienceBefore: 3,
      experienceAfter: 4,
      rankBefore: 0,
      rankAfter: 0,
    })).toBe('Свежевание: Новичок свежевания · первые успехи крепнут');

    expect(formatPlayerSkillGainLine({
      skillCode: 'gathering.skinning',
      experienceBefore: 99,
      experienceAfter: 100,
      rankBefore: 0,
      rankAfter: 1,
    })).toBe('Свежевание: Практик свежевания · новый ранг');
  });

  it('formats action preview skill titles consistently', () => {
    expect(formatPlayerSkillTitles([
      'gathering.skinning',
      'gathering.essence_extraction',
    ])).toBe('Свежевание, Извлечение эссенции');

    expect(formatPlayerSkillTitles([])).toBe('без роста навыка');
  });
});
