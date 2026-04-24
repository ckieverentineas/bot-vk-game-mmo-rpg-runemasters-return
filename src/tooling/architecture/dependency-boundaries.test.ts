import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface DependencyBoundaryRule {
  readonly name: string;
  readonly from: RegExp;
  readonly forbiddenTarget: RegExp;
}

const sourceRoot = path.join(process.cwd(), 'src');

const dependencyBoundaryRules: readonly DependencyBoundaryRule[] = [
  {
    name: 'module domain must not import application, infrastructure or transport layers',
    from: /^src\/modules\/[^/]+\/domain\//,
    forbiddenTarget: /\/application\/|\/infrastructure\/|^src\/(app|database|vk)\//,
  },
  {
    name: 'module application must not import infrastructure, composition or transport layers',
    from: /^src\/modules\/[^/]+\/application\//,
    forbiddenTarget: /\/infrastructure\/|^src\/(app|database|vk)\//,
  },
  {
    name: 'vk transport must not import infrastructure or database layers directly',
    from: /^src\/vk\//,
    forbiddenTarget: /\/infrastructure\/|^src\/database\//,
  },
];

const moduleReferencePattern = /\b(?:import|export)(?:\s+type)?\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;

const listSourceFiles = (directory: string): readonly string[] => (
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
      ? [entryPath]
      : [];
  })
);

const normalizePath = (filePath: string): string => (
  path.relative(process.cwd(), filePath).replaceAll(path.sep, '/')
);

const resolveRelativeImport = (fromFile: string, specifier: string): string | null => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const basePath = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    `${basePath}.ts`,
    path.join(basePath, 'index.ts'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

const findDependencyBoundaryViolations = (): readonly string[] => (
  listSourceFiles(sourceRoot).flatMap((sourceFile) => {
    const sourcePath = normalizePath(sourceFile);
    const source = readFileSync(sourceFile, 'utf8');

    return Array.from(source.matchAll(moduleReferencePattern)).flatMap((match) => {
      const targetFile = resolveRelativeImport(sourceFile, match[1]!);
      if (!targetFile) {
        return [];
      }

      const targetPath = normalizePath(targetFile);

      return dependencyBoundaryRules
        .filter((rule) => rule.from.test(sourcePath) && rule.forbiddenTarget.test(targetPath))
        .map((rule) => `${rule.name}: ${sourcePath} -> ${targetPath}`);
    });
  })
);

describe('architecture dependency boundaries', () => {
  it('keeps domain, application and VK dependencies pointing inward', () => {
    expect(findDependencyBoundaryViolations()).toEqual([]);
  });
});
