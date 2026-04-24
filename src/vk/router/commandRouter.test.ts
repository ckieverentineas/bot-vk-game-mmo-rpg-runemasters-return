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
    expect(normalizeCommand('проверить школу')).toBe(gameCommands.explore);
    expect(normalizeCommand('блок')).toBe(gameCommands.defend);
    expect(normalizeCommand('книга зверей')).toBe(gameCommands.bestiary);
  });

  it('нормализует исторические алиасы навигации по рунам', () => {
    expect(normalizeCommand('++РУНА')).toBe(gameCommands.nextRune);
    expect(normalizeCommand('--руна')).toBe(gameCommands.previousRune);
    expect(normalizeCommand('>>руна')).toBe(gameCommands.nextRunePage);
    expect(normalizeCommand('<<руна')).toBe(gameCommands.previousRunePage);
  });

  it('нормализует короткие алиасы алхимии пилюль', () => {
    expect(normalizeCommand('ЖИВУЧЕСТЬ')).toBe(gameCommands.craftVitalCharm);
    expect(normalizeCommand('удар')).toBe(gameCommands.craftKeenEdge);
    expect(normalizeCommand('стойкость')).toBe(gameCommands.craftGuardPlate);
    expect(normalizeCommand('фокус')).toBe(gameCommands.craftRuneFocus);
    expect(normalizeCommand('оберег')).toBe(gameCommands.craftVitalCharm);
    expect(normalizeCommand('восстановление')).toBe(gameCommands.craftVitalCharm);
    expect(normalizeCommand('выпить')).toBe(gameCommands.useHealingPill);
  });

  it('не ломает неизвестные текстовые команды', () => {
    expect(normalizeCommand('неизвестная-команда')).toBe('неизвестная-команда');
  });

  it('выделяет ник из текстовой команды регистрации', () => {
    const resolved = resolveCommandEnvelope({
      text: 'Начать Лианна',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 77,
      id: 501,
      messagePayload: null,
    } as never);

    expect(resolved.command).toBe(gameCommands.start);
    expect(resolved.commandArgument).toBe('Лианна');
    expect(resolved.intentId).toBeNull();
  });

  it('не считает боевой алиас ником регистрации', () => {
    const resolved = resolveCommandEnvelope({
      text: 'начать бой',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 78,
      id: 502,
      messagePayload: null,
    } as never);

    expect(resolved.command).toBe(gameCommands.engageBattle);
    expect(resolved.commandArgument).toBeNull();
  });

  it('больше не считает старые stat-команды поддержанным transport-командным слоем', () => {
    expect(normalizeCommand('+АТК')).toBe('+атк');

    const resolved = resolveCommandEnvelope({
      text: '+атк',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 79,
      id: 503,
      messagePayload: null,
    } as never);

    expect(resolved.command).toBe('+атк');
    expect(resolved.intentId).toBeNull();
    expect(resolved.intentSource).toBeNull();
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

  it('выводит server-owned intent для legacy text алхимии пилюль', () => {
    const resolved = resolveCommandEnvelope({
      text: 'живучесть',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 84,
      id: 508,
      messagePayload: null,
    } as never);

    expect(resolved.command).toBe(gameCommands.craftVitalCharm);
    expect(resolved.intentId).toBe('legacy-text:2000000001:1001:84:пилюля восстановления');
    expect(resolved.stateKey).toBeNull();
    expect(resolved.intentSource).toBe('legacy_text');
  });

  it('выводит server-owned intent для legacy text применения пилюль', () => {
    const resolved = resolveCommandEnvelope({
      text: 'выпить',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 85,
      id: 509,
      messagePayload: null,
    } as never);

    expect(resolved.command).toBe(gameCommands.useHealingPill);
    expect(resolved.intentId).toBe('legacy-text:2000000001:1001:85:выпить пилюлю восстановления');
    expect(resolved.stateKey).toBeNull();
    expect(resolved.intentSource).toBe('legacy_text');
  });

  it('выводит server-owned intent для legacy text loadout мутаций', () => {
    const equip = resolveCommandEnvelope({
      text: 'надеть',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 82,
      id: 506,
      messagePayload: null,
    } as never);
    const unequip = resolveCommandEnvelope({
      text: 'снять',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 83,
      id: 507,
      messagePayload: null,
    } as never);

    expect(equip.intentId).toBe('legacy-text:2000000001:1001:82:надеть');
    expect(equip.intentSource).toBe('legacy_text');
    expect(unequip.intentId).toBe('legacy-text:2000000001:1001:83:снять');
    expect(unequip.intentSource).toBe('legacy_text');
  });

  it('выводит server-owned intent для legacy text навигации по рунам и её алиасов', () => {
    const nextPage = resolveCommandEnvelope({
      text: 'руны >',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 84,
      id: 508,
      messagePayload: null,
    } as never);
    const nextAlias = resolveCommandEnvelope({
      text: '>>руна',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 85,
      id: 509,
      messagePayload: null,
    } as never);
    const slot = resolveCommandEnvelope({
      text: 'руна слот 1',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 86,
      id: 510,
      messagePayload: null,
    } as never);
    const slotFive = resolveCommandEnvelope({
      text: 'руна слот 5',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 87,
      id: 511,
      messagePayload: null,
    } as never);

    expect(nextPage.command).toBe(gameCommands.nextRunePage);
    expect(nextPage.intentId).toBe('legacy-text:2000000001:1001:84:руны >');
    expect(nextPage.intentSource).toBe('legacy_text');
    expect(nextAlias.command).toBe(gameCommands.nextRunePage);
    expect(nextAlias.intentId).toBe('legacy-text:2000000001:1001:85:руны >');
    expect(nextAlias.intentSource).toBe('legacy_text');
    expect(slot.command).toBe(gameCommands.selectRuneSlot1);
    expect(slot.intentId).toBe('legacy-text:2000000001:1001:86:руна слот 1');
    expect(slot.intentSource).toBe('legacy_text');
    expect(slotFive.command).toBe(gameCommands.selectRuneSlot5);
    expect(slotFive.intentId).toBe('legacy-text:2000000001:1001:87:руна слот 5');
    expect(slotFive.intentSource).toBe('legacy_text');
  });

  it('выводит server-owned intent для legacy text изменения стата руны', () => {
    const rerollAttack = resolveCommandEnvelope({
      text: '~атк',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 88,
      id: 512,
      messagePayload: null,
    } as never);

    expect(rerollAttack.command).toBe(gameCommands.rerollAttack);
    expect(rerollAttack.intentId).toBe('legacy-text:2000000001:1001:88:~атк');
    expect(rerollAttack.intentSource).toBe('legacy_text');
  });

  it('выводит server-owned intent для tutorial navigation и алиаса возврата', () => {
    const skip = resolveCommandEnvelope({
      text: 'пропустить обучение',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 84,
      id: 508,
      messagePayload: null,
    } as never);
    const returnAlias = resolveCommandEnvelope({
      text: 'в мир',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 85,
      id: 509,
      messagePayload: null,
    } as never);

    expect(skip.command).toBe(gameCommands.skipTutorial);
    expect(skip.intentId).toBe('legacy-text:2000000001:1001:84:пропустить обучение');
    expect(skip.intentSource).toBe('legacy_text');
    expect(returnAlias.command).toBe(gameCommands.returnToAdventure);
    expect(returnAlias.intentId).toBe('legacy-text:2000000001:1001:85:в приключения');
    expect(returnAlias.intentSource).toBe('legacy_text');
  });

  it('выводит server-owned intent для legacy text входа в экран обучения и его алиаса', () => {
    const location = resolveCommandEnvelope({
      text: 'локация',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 90,
      id: 514,
      messagePayload: null,
    } as never);
    const alias = resolveCommandEnvelope({
      text: 'обучение',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 91,
      id: 515,
      messagePayload: null,
    } as never);

    expect(location.command).toBe(gameCommands.location);
    expect(location.intentId).toBe('legacy-text:2000000001:1001:90:локация');
    expect(location.intentSource).toBe('legacy_text');
    expect(alias.command).toBe(gameCommands.location);
    expect(alias.intentId).toBe('legacy-text:2000000001:1001:91:локация');
    expect(alias.intentSource).toBe('legacy_text');
  });

  it('выводит server-owned intent для legacy text исследования', () => {
    const explore = resolveCommandEnvelope({
      text: 'исследовать',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 86,
      id: 510,
      messagePayload: null,
    } as never);

    expect(explore.command).toBe(gameCommands.explore);
    expect(explore.intentId).toBe('legacy-text:2000000001:1001:86:исследовать');
    expect(explore.intentSource).toBe('legacy_text');
  });

  it('нормализует school-test alias в обычное исследование с legacy intent', () => {
    const explore = resolveCommandEnvelope({
      text: 'проверить школу',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 92,
      id: 516,
      messagePayload: null,
    } as never);

    expect(explore.command).toBe(gameCommands.explore);
    expect(explore.intentId).toBe('legacy-text:2000000001:1001:92:исследовать');
    expect(explore.intentSource).toBe('legacy_text');
  });

  it('выводит server-owned intent для legacy text получения награды квеста', () => {
    const resolved = resolveCommandEnvelope({
      text: 'забрать награду',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 93,
      id: 517,
      messagePayload: null,
    } as never);

    expect(resolved.command).toBe(gameCommands.claimQuestReward);
    expect(resolved.intentId).toBe('legacy-text:2000000001:1001:93:забрать награду');
    expect(resolved.intentSource).toBe('legacy_text');
  });

  it('нормализует трактирные алиасы в доску Рунного дозора', () => {
    const tavern = resolveCommandEnvelope({
      text: 'доска угроз',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 94,
      id: 518,
      messagePayload: null,
    } as never);

    expect(tavern.command).toBe(gameCommands.runicTavern);
    expect(tavern.intentId).toBeNull();
    expect(tavern.intentSource).toBeNull();
  });

  it('выводит server-owned intent для legacy text боевых команд', () => {
    const attack = resolveCommandEnvelope({
      text: 'атака',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 86,
      id: 510,
      messagePayload: null,
    } as never);
    const defendAlias = resolveCommandEnvelope({
      text: 'блок',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 87,
      id: 511,
      messagePayload: null,
    } as never);
    const engageAlias = resolveCommandEnvelope({
      text: 'бой',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 90,
      id: 514,
      messagePayload: null,
    } as never);
    const fleeAlias = resolveCommandEnvelope({
      text: 'бежать',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 91,
      id: 515,
      messagePayload: null,
    } as never);
    const spell = resolveCommandEnvelope({
      text: 'спелл',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 88,
      id: 512,
      messagePayload: null,
    } as never);
    const skills = resolveCommandEnvelope({
      text: 'навыки',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 89,
      id: 513,
      messagePayload: null,
    } as never);

    expect(attack.intentId).toBe('legacy-text:2000000001:1001:86:атака');
    expect(attack.intentSource).toBe('legacy_text');
    expect(defendAlias.command).toBe(gameCommands.defend);
    expect(defendAlias.intentId).toBe('legacy-text:2000000001:1001:87:защита');
    expect(engageAlias.command).toBe(gameCommands.engageBattle);
    expect(engageAlias.intentId).toBe('legacy-text:2000000001:1001:90:в бой');
    expect(engageAlias.intentSource).toBe('legacy_text');
    expect(fleeAlias.command).toBe(gameCommands.fleeBattle);
    expect(fleeAlias.intentId).toBe('legacy-text:2000000001:1001:91:отступить');
    expect(fleeAlias.intentSource).toBe('legacy_text');
    expect(skills.command).toBe(gameCommands.skills);
    expect(skills.intentId).toBe('legacy-text:2000000001:1001:89:навыки');
    expect(spell.command).toBe(gameCommands.spell);
    expect(spell.intentId).toBe('legacy-text:2000000001:1001:88:спелл');
  });

  it('не теряет legacy text intent из-за пустого payload объекта', () => {
    const resolved = resolveCommandEnvelope({
      text: 'создать',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 81,
      id: 505,
      messagePayload: {},
    } as never);

    expect(resolved.intentId).toBe('legacy-text:2000000001:1001:81:создать');
    expect(resolved.intentSource).toBe('legacy_text');
  });

  it.each([
    {
      title: 'intentId',
      payload: { intentId: 'intent-1' },
    },
    {
      title: 'stateKey',
      payload: { stateKey: 'state-1' },
    },
  ])('сохраняет payload ownership даже если в payload есть только $title', ({ payload }) => {
    const resolved = resolveCommandEnvelope({
      text: 'создать',
      senderId: 1001,
      peerId: 2000000001,
      conversationMessageId: 81,
      id: 505,
      messagePayload: payload,
    } as never);

    expect(resolved.command).toBe(gameCommands.craftRune);
    expect(resolved.intentSource).toBe('payload');
  });

  it('fails closed when guarded legacy text command lacks message metadata', () => {
    const resolved = resolveCommandEnvelope({
      text: 'создать',
      senderId: 1001,
      messagePayload: null,
    } as never);

    expect(resolved.intentId).toBeNull();
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
