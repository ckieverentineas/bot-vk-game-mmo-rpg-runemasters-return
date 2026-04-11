import { describe, expect, it } from 'vitest';

import { gameCommands } from '../commands/catalog';
import { normalizeCommand } from './commandRouter';

describe('normalizeCommand', () => {
  it('приводит команду к нижнему регистру и обрезает пробелы', () => {
    expect(normalizeCommand('  ПРофиль  ')).toBe(gameCommands.profile);
  });

  it('нормализует алиасы обучения и возврата в мир', () => {
    expect(normalizeCommand('обучение')).toBe(gameCommands.location);
    expect(normalizeCommand('в мир')).toBe(gameCommands.returnToAdventure);
  });

  it('нормализует исторические алиасы навигации по рунам', () => {
    expect(normalizeCommand('++РУНА')).toBe(gameCommands.nextRune);
    expect(normalizeCommand('--руна')).toBe(gameCommands.previousRune);
  });

  it('не ломает неизвестные текстовые команды', () => {
    expect(normalizeCommand('неизвестная-команда')).toBe('неизвестная-команда');
  });
});
