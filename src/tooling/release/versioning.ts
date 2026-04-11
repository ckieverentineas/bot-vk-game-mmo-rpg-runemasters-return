export const releaseCommitWindowSize = 100;

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

export const resolveCommitsUntilNextRelease = (commitCount: number): number => {
  const normalizedCommitCount = normalizeCommitCount(commitCount);
  return resolveNextReleaseCommitTarget(normalizedCommitCount) - normalizedCommitCount;
};
