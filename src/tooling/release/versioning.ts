export const releaseCommitWindowSize = 100;

export interface ReleaseStatusSnapshot {
  readonly commitCount: number;
  readonly currentVersion: string;
  readonly nextReleaseCommitTarget: number;
  readonly commitsUntilNextRelease: number;
}

const normalizeCommitCount = (commitCount: number): number => {
  if (!Number.isFinite(commitCount) || commitCount <= 0) {
    return 0;
  }

  return Math.floor(commitCount);
};

export const formatReleaseVersion = (commitCount: number): string => {
  const normalizedCommitCount = normalizeCommitCount(commitCount);
  const majorVersion = Math.floor(normalizedCommitCount / releaseCommitWindowSize);
  const minorVersion = normalizedCommitCount % releaseCommitWindowSize;

  return `${majorVersion}.${minorVersion.toString().padStart(2, '0')}`;
};

export const resolveNextReleaseCommitTarget = (commitCount: number): number => {
  const normalizedCommitCount = normalizeCommitCount(commitCount);
  return (Math.floor(normalizedCommitCount / releaseCommitWindowSize) + 1) * releaseCommitWindowSize;
};

export const resolveReleaseStatus = (commitCount: number): ReleaseStatusSnapshot => {
  const normalizedCommitCount = normalizeCommitCount(commitCount);

  const nextReleaseCommitTarget = resolveNextReleaseCommitTarget(normalizedCommitCount);

  return {
    commitCount: normalizedCommitCount,
    currentVersion: formatReleaseVersion(normalizedCommitCount),
    nextReleaseCommitTarget,
    commitsUntilNextRelease: nextReleaseCommitTarget - normalizedCommitCount,
  };
};

export const resolveCommitsUntilNextRelease = (commitCount: number): number => (
  resolveReleaseStatus(commitCount).commitsUntilNextRelease
);
