import { describe, expect, it } from 'vitest';

import { formatReleaseVersion, resolveCommitsUntilNextRelease, resolveNextReleaseCommitTarget } from './versioning';

describe('formatReleaseVersion', () => {
  it('считает первые сто коммитов версией 1.00', () => {
    expect(formatReleaseVersion(100)).toBe('1.00');
  });

  it('оставляет дорелизную историю в диапазоне 0.xx', () => {
    expect(formatReleaseVersion(37)).toBe('0.37');
  });

  it('переносит остаток коммитов в младшую часть версии', () => {
    expect(formatReleaseVersion(245)).toBe('2.45');
  });
});

describe('release milestones', () => {
  it('считает следующий релизный рубеж кратным ста коммитам', () => {
    expect(resolveNextReleaseCommitTarget(145)).toBe(200);
  });

  it('показывает сколько коммитов осталось до следующего релиза', () => {
    expect(resolveCommitsUntilNextRelease(145)).toBe(55);
  });
});
