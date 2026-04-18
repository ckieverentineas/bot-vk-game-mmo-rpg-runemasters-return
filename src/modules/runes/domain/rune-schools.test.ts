import { describe, expect, it } from 'vitest';

import { getRuneSchoolPresentation, getSchoolDefinitionForArchetype, listSchoolDefinitions } from './rune-schools';

describe('rune school definitions', () => {
  it('resolves canonical school definition and presentation for a starter archetype', () => {
    const school = getSchoolDefinitionForArchetype('stone');
    const presentation = getRuneSchoolPresentation('stone');

    expect(school).toMatchObject({
      code: 'stone',
      name: 'Твердь',
      starterArchetypeCode: 'stone',
    });
    expect(presentation).toMatchObject({
      name: 'Твердь',
      schoolLine: 'Школа Тверди',
      roleName: 'Страж',
    });
  });

  it('exposes the shipped starter school roster through one canonical contract', () => {
    expect(listSchoolDefinitions().map(({ code }) => code)).toEqual(['ember', 'stone', 'gale', 'echo']);
  });
});
