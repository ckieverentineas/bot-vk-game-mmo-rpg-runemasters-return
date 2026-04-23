import { describe, expect, it } from 'vitest';

import type { BestiaryView } from '../../modules/world/application/read-models/bestiary';
import { renderBestiary } from './bestiaryMessages';

const createBestiary = (): BestiaryView => ({
  pageNumber: 1,
  totalPages: 1,
  totalLocations: 1,
  locations: [
    {
      biome: {
        id: 1,
        code: 'dark-forest',
        name: 'Тёмный лес',
        description: 'Стартовая чаща.',
        minLevel: 1,
        maxLevel: 15,
      },
      discoveredEnemyCount: 2,
      revealedDropCount: 1,
      totalEnemyCount: 3,
      enemies: [
        {
          isDiscovered: true,
          isDropRevealed: false,
          tacticalProfile: {
            code: 'HEAVY_STRIKE',
            habitLine: 'на просадке готовит тяжёлый удар сильнее обычного',
            answerLine: 'встречайте угрозу защитой; готовая руна тоже хорошо бьёт по раскрытому замыслу',
          },
          template: {
            code: 'forest-wolf',
            biomeCode: 'dark-forest',
            name: 'Лесной волк',
            kind: 'wolf',
            isElite: false,
            isBoss: false,
            baseStats: {
              health: 15,
              attack: 4,
              defence: 1,
              magicDefence: 0,
              dexterity: 4,
              intelligence: 2,
            },
            scales: {
              health: 1,
              attack: 1,
              defence: 1,
              magicDefence: 1,
              dexterity: 1,
              intelligence: 1,
            },
            baseExperience: 14,
            baseGold: 5,
            runeDropChance: 22,
            lootTable: { leather: 2, bone: 1 },
            attackText: 'впивается клыками',
          },
        },
        {
          isDiscovered: true,
          isDropRevealed: true,
          tacticalProfile: {
            code: 'GUARD_BREAK',
            habitLine: 'на просадке готовит пробивающий удар и сбивает накопленную защиту',
            answerLine: 'отвечайте атакой или готовой руной; чистую стойку оставьте на другой ход',
          },
          template: {
            code: 'ash-seer',
            biomeCode: 'dark-forest',
            name: 'Пепельная ведунья',
            kind: 'mage',
            isElite: true,
            isBoss: false,
            baseStats: {
              health: 24,
              attack: 7,
              defence: 2,
              magicDefence: 4,
              dexterity: 5,
              intelligence: 8,
            },
            scales: {
              health: 1,
              attack: 1,
              defence: 1,
              magicDefence: 1,
              dexterity: 1,
              intelligence: 1,
            },
            baseExperience: 24,
            baseGold: 9,
            runeDropChance: 28,
            lootTable: { herb: 2, essence: 1 },
            attackText: 'выпускает пепельный прорыв',
          },
        },
        {
          isDiscovered: false,
          isDropRevealed: false,
          tacticalProfile: null,
          template: {
            code: 'secret-enemy',
            biomeCode: 'dark-forest',
            name: 'Секретный след',
            kind: 'spirit',
            isElite: false,
            isBoss: false,
            baseStats: {
              health: 10,
              attack: 2,
              defence: 1,
              magicDefence: 1,
              dexterity: 3,
              intelligence: 2,
            },
            scales: {
              health: 1,
              attack: 1,
              defence: 1,
              magicDefence: 1,
              dexterity: 1,
              intelligence: 1,
            },
            baseExperience: 10,
            baseGold: 4,
            runeDropChance: 18,
            lootTable: { essence: 1 },
            attackText: 'шепчет',
          },
        },
      ],
    },
  ],
});

describe('renderBestiary', () => {
  it('keeps enemy and drop information hidden until the player unlocks it', () => {
    const message = renderBestiary(createBestiary());

    expect(message).toContain('📖 Бестиарий');
    expect(message).toContain('📍 Тёмный лес · ур. 1-15');
    expect(message).toContain('Следы: 2/3 · добыча: 1/3');
    expect(message).toContain('Лесной волк · обычный · зверь');
    expect(message).toContain('опасность: на просадке готовит тяжёлый удар сильнее обычного');
    expect(message).toContain('ответ: встречайте угрозу защитой; готовая руна тоже хорошо бьёт по раскрытому замыслу');
    expect(message).toContain('добыча скрыта до первого разобранного трофея');
    expect(message).toContain('Пепельная ведунья · элита · заклинатель');
    expect(message).toContain('опасность: на просадке готовит пробивающий удар и сбивает накопленную защиту');
    expect(message).toContain('ответ: отвечайте атакой или готовой руной; чистую стойку оставьте на другой ход');
    expect(message).toContain('добыча: +2 травы · +1 эссенция · шанс руны: 28%');
    expect(message).toContain('3. ??? — след не встречен');
    expect(message).not.toContain('Секретный след');
  });
});
