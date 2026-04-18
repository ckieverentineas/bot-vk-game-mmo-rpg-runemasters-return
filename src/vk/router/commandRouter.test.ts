import { describe, expect, it } from 'vitest';

import { gameCommands } from '../commands/catalog';
import { normalizeCommand, resolveCommandEnvelope } from './commandRouter';

describe('normalizeCommand', () => {
  it('приводит команду к нижнему регистру и обрезает пробелы', () => {
    expect(normalizeCommand('  ПРофиль  ')).toBe(gameCommands.profile);
  });

  it('нормализует алиасы обучения и возврата в мир', () => {
    expect(normalizeCommand('обучение')).toBe(gameCommands.location);
    expect(normalizeCommand('в мир')).toBe(gameCommands.returnToAdventure);
    expect(normalizeCommand('блок')).toBe(gameCommands.defend);
  });

  it('нормализует исторические алиасы навигации по рунам', () => {
    expect(normalizeCommand('++РУНА')).toBe(gameCommands.nextRune);
    expect(normalizeCommand('--руна')).toBe(gameCommands.previousRune);
    expect(normalizeCommand('>>руна')).toBe(gameCommands.nextRunePage);
    expect(normalizeCommand('<<руна')).toBe(gameCommands.previousRunePage);
  });

  it('не ломает неизвестные текстовые команды', () => {
    expect(normalizeCommand('неизвестная-команда')).toBe('неизвестная-команда');
  });

  it('читает command intent из payload, если он есть', () => {
    const resolved = resolveCommandEnvelope({
      messagePayload: {
        command: gameCommands.craftRune,
        intentId: 'intent-123',
        stateKey: 'state-123',
      },
      text: '',
    } as never);

    expect(resolved.command).toBe(gameCommands.craftRune);
    expect(resolved.intentId).toBe('intent-123');
    expect(resolved.stateKey).toBe('state-123');
    expect(resolved.intentSource).toBe('payload');
  });

  it('выводит server-owned intent для legacy text рунных мутаций', () => {
    const resolved = resolveCommandEnvelope({
      text: 'создать',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 77,
      id: 501,
      messagePayload: null,
    } as never);

    expect(resolved.command).toBe(gameCommands.craftRune);
    expect(resolved.intentId).toBe('legacy-text:2000000001:1001:77:создать');
    expect(resolved.stateKey).toBeNull();
    expect(resolved.intentSource).toBe('legacy_text');
  });

  it('не назначает legacy intent для обычных текстовых команд без replay rail', () => {
    const resolved = resolveCommandEnvelope({
      text: 'профиль',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 78,
      id: 502,
      messagePayload: null,
    } as never);

    expect(resolved.command).toBe(gameCommands.profile);
    expect(resolved.intentId).toBeNull();
    expect(resolved.intentSource).toBeNull();
  });
});
