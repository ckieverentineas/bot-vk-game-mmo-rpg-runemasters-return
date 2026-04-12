import { execSync } from 'node:child_process';

export const readGitCommitCount = (): number => {
  try {
    const rawValue = execSync('git rev-list --count HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const parsedCount = Number.parseInt(rawValue, 10);
    return Number.isNaN(parsedCount) ? 0 : parsedCount;
  } catch {
    return 0;
  }
};
