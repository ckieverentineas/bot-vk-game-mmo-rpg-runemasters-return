import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..', '..', '..');

const parseGitCommitCount = (rawValue: string): number => {
  const normalizedValue = rawValue.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error(`Git вернул некорректное количество коммитов: "${normalizedValue}".`);
  }

  return Number.parseInt(normalizedValue, 10);
};

export const readGitCommitCount = (): number => {
  let rawValue: string;

  try {
    rawValue = execFileSync('git', ['-c', `safe.directory=${projectRoot}`, 'rev-list', '--count', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Не удалось прочитать количество коммитов Git. Проверьте, что Git доступен и проект открыт внутри репозитория.',
    );
  }

  return parseGitCommitCount(rawValue);
};
