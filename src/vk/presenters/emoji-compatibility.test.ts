import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

interface UnsupportedEmoji {
  readonly label: string;
  readonly emoji: string;
}

const sourceRoot = join(process.cwd(), 'src');

const unsupportedVkEmoji: readonly UnsupportedEmoji[] = [
  { label: 'life ring', emoji: String.fromCodePoint(0x1F6DF) },
  { label: 'rock', emoji: String.fromCodePoint(0x1FAA8) },
  { label: 'mouse trap', emoji: String.fromCodePoint(0x1FAA4) },
];

const listSourceFiles = (directory: string): readonly string[] => {
  const entries = readdirSync(directory);

  return entries.flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return listSourceFiles(path);
    }

    return path.endsWith('.ts') ? [path] : [];
  });
};

describe('VK emoji compatibility', () => {
  it('keeps runtime copy free from emojis that render as unknown glyphs in VK clients', () => {
    const violations = listSourceFiles(sourceRoot).flatMap((path) => {
      const source = readFileSync(path, 'utf8');

      return unsupportedVkEmoji.flatMap((entry) => (
        source.includes(entry.emoji)
          ? [`${path}: ${entry.label}`]
          : []
      ));
    });

    expect(violations).toEqual([]);
  });
});
