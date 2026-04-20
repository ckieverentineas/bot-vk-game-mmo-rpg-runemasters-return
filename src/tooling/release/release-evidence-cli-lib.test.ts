import { describe, expect, it } from 'vitest';

import { resolveReleaseEvidenceWindow } from './release-evidence-cli-lib';

describe('resolveReleaseEvidenceWindow', () => {
  it('expands date-only boundaries to the full day', () => {
    const window = resolveReleaseEvidenceWindow({
      since: '2026-04-19',
      until: '2026-04-20',
      days: null,
    });

    expect(window.since.toISOString()).toBe('2026-04-19T00:00:00.000Z');
    expect(window.until.toISOString()).toBe('2026-04-20T23:59:59.999Z');
  });

  it('uses the requested number of days when explicit dates are omitted', () => {
    const window = resolveReleaseEvidenceWindow({
      since: null,
      until: null,
      days: 3,
      now: new Date('2026-04-20T10:00:00.000Z'),
    });

    expect(window.since.toISOString()).toBe('2026-04-17T10:00:00.000Z');
    expect(window.until.toISOString()).toBe('2026-04-20T10:00:00.000Z');
  });
});
