import { execFileSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';

import { readGitCommitCount } from './read-git-commit-count';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

const mockedExecFileSync = vi.mocked(execFileSync);

describe('readGitCommitCount', () => {
  it('reads the current repository commit count', () => {
    mockedExecFileSync.mockReturnValueOnce('103\n');

    expect(readGitCommitCount()).toBe(103);
    expect(mockedExecFileSync).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['rev-list', '--count', 'HEAD']),
      expect.objectContaining({
        cwd: expect.any(String),
      }),
    );
  });

  it('does not hide git failures as a zero commit history', () => {
    mockedExecFileSync.mockImplementationOnce(() => {
      throw new Error('dubious ownership');
    });

    expect(() => readGitCommitCount()).toThrow('Не удалось прочитать количество коммитов Git');
  });

  it('rejects non-numeric git output', () => {
    mockedExecFileSync.mockReturnValueOnce('not-a-number\n');

    expect(() => readGitCommitCount()).toThrow('Git вернул некорректное количество коммитов');
  });
});
