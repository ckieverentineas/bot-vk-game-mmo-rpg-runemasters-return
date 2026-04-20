import { describe, expect, it } from 'vitest';

import {
  buildDocumentCheckResult,
  evaluateReleasePreflight,
  requiredDocuments,
  resolvePreflightStatusMessage,
} from './release-preflight-lib';

describe('resolvePreflightStatusMessage', () => {
  it('returns the combined blocking message when docs and content both fail', () => {
    expect(resolvePreflightStatusMessage(true, true)).toContain('обязательные документы, контентные данные и баланс');
  });

  it('returns the green message when no blockers exist', () => {
    expect(resolvePreflightStatusMessage(false, false)).toBe('Статус: preflight пройден.');
  });
});

describe('evaluateReleasePreflight', () => {
  it('marks release as blocked when any required document is missing', () => {
    const report = evaluateReleasePreflight([
      buildDocumentCheckResult(requiredDocuments[0]!, 'missing'),
      buildDocumentCheckResult(requiredDocuments[1]!, 'ok'),
    ], false);

    expect(report.hasBlockingDocumentIssues).toBe(true);
    expect(report.exitCode).toBe(1);
    expect(report.statusMessage).toContain('обязательные документы');
  });

  it('marks release as blocked when content validation fails even with valid docs', () => {
    const report = evaluateReleasePreflight([
      ...requiredDocuments.map((document) => buildDocumentCheckResult(document, 'ok')),
    ], true);

    expect(report.hasBlockingDocumentIssues).toBe(false);
    expect(report.hasBlockingContentIssues).toBe(true);
    expect(report.exitCode).toBe(1);
    expect(report.statusMessage).toContain('контентные данные и баланс');
  });

  it('stays green only when documents and content are both valid', () => {
    const report = evaluateReleasePreflight([
      ...requiredDocuments.map((document) => buildDocumentCheckResult(document, 'ok')),
    ], false);

    expect(report.exitCode).toBe(0);
    expect(report.statusMessage).toBe('Статус: preflight пройден.');
  });
});
