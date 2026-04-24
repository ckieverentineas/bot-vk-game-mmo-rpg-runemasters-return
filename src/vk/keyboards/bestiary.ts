import { Keyboard } from 'vk-io';

import type {
  BestiaryEnemyDetailView,
  BestiaryLocationDetailView,
  BestiaryOverviewView,
} from '../../modules/world/application/read-models/bestiary';
import { bestiaryEnemyPageSize } from '../../modules/world/domain/bestiary';
import {
  createBestiaryEnemyCommand,
  createBestiaryEnemyRewardCommand,
  createBestiaryLocationCommand,
  createBestiaryLocationRewardCommand,
  createBestiaryPageCommand,
  gameCommands,
} from '../commands/catalog';
import { buildKeyboard } from './builder';
import type { KeyboardBuilder, KeyboardLayout } from './types';

const locationButtonsPerRow = 2;
const enemyButtonsPerRow = 2;
const buttonLabelMaxLength = 40;

const resolvePreviousPageNumber = (bestiary: BestiaryOverviewView): number => (
  bestiary.pageNumber > 1 ? bestiary.pageNumber - 1 : bestiary.totalPages
);

const resolveNextPageNumber = (bestiary: BestiaryOverviewView): number => (
  bestiary.pageNumber < bestiary.totalPages ? bestiary.pageNumber + 1 : 1
);

const chunkRows = <T>(items: readonly T[], size: number): readonly (readonly T[])[] => {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
};

const truncateLabel = (text: string, maxLength = buttonLabelMaxLength): string => (
  text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}…`
);

const isLocationRewardClaimable = (detail: BestiaryLocationDetailView): boolean => (
  detail.location.isUnlocked && !detail.location.discoveryReward.isClaimed
);

const hasClaimableEnemyReward = (detail: BestiaryEnemyDetailView): boolean => (
  detail.enemy.killMilestones.some((milestone) => milestone.isCompleted && !milestone.isClaimed)
);

const createLocationRows = (bestiary: BestiaryOverviewView): KeyboardLayout => {
  const buttons = bestiary.locations
    .filter((location) => location.isUnlocked)
    .map((location) => ({
      label: truncateLabel(`${location.discoveryReward.isClaimed ? '📍' : '🎁'} ${location.biome.name}`),
      command: createBestiaryLocationCommand(location.biome.code),
      color: Keyboard.PRIMARY_COLOR,
    }));

  return chunkRows(buttons, locationButtonsPerRow);
};

const createBestiaryLayout = (bestiary: BestiaryOverviewView): KeyboardLayout => [
  ...createLocationRows(bestiary),
  ...(bestiary.totalPages > 1
    ? [[
        {
          label: '◀ Назад',
          command: createBestiaryPageCommand(resolvePreviousPageNumber(bestiary)),
          color: Keyboard.SECONDARY_COLOR,
        },
        {
          label: '▶ Вперед',
          command: createBestiaryPageCommand(resolveNextPageNumber(bestiary)),
          color: Keyboard.SECONDARY_COLOR,
        },
      ] as const]
    : []),
  [
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
];

export const createBestiaryKeyboard = (bestiary: BestiaryOverviewView): KeyboardBuilder => (
  buildKeyboard(createBestiaryLayout(bestiary))
);

const resolvePreviousEnemyPageNumber = (detail: BestiaryLocationDetailView): number => (
  detail.enemyPageNumber > 1 ? detail.enemyPageNumber - 1 : detail.totalEnemyPages
);

const resolveNextEnemyPageNumber = (detail: BestiaryLocationDetailView): number => (
  detail.enemyPageNumber < detail.totalEnemyPages ? detail.enemyPageNumber + 1 : 1
);

const createLocationRewardRows = (detail: BestiaryLocationDetailView): KeyboardLayout => (
  isLocationRewardClaimable(detail)
    ? [[{
        label: '🎁 Забрать награду локации',
        command: createBestiaryLocationRewardCommand(detail.location.biome.code),
        color: Keyboard.POSITIVE_COLOR,
      }]]
    : []
);

const createEnemyButtonLabel = (
  detail: BestiaryLocationDetailView,
  enemyIndex: number,
): string => {
  const enemy = detail.enemies[enemyIndex];
  const visibleIndex = ((detail.enemyPageNumber - 1) * bestiaryEnemyPageSize) + enemyIndex + 1;

  if (!enemy?.isDiscovered) {
    return `❔ След ${visibleIndex}`;
  }

  const hasReward = enemy.killMilestones.some((milestone) => milestone.isCompleted && !milestone.isClaimed);
  return truncateLabel(`${hasReward ? '🎁' : '🐾'} ${enemy.template.name}`);
};

const createEnemyRows = (detail: BestiaryLocationDetailView): KeyboardLayout => {
  const buttons = detail.enemies.map((enemy, index) => {
    const hasReward = enemy.killMilestones.some((milestone) => milestone.isCompleted && !milestone.isClaimed);

    return {
      label: createEnemyButtonLabel(detail, index),
      command: createBestiaryEnemyCommand(detail.location.biome.code, enemy.template.code),
      color: hasReward ? Keyboard.POSITIVE_COLOR : enemy.isDiscovered ? Keyboard.PRIMARY_COLOR : Keyboard.SECONDARY_COLOR,
    };
  });

  return chunkRows(buttons, enemyButtonsPerRow);
};

const createEnemyPageRows = (detail: BestiaryLocationDetailView): KeyboardLayout => (
  detail.totalEnemyPages > 1
    ? [[
        {
          label: '◀ Следы',
          command: createBestiaryLocationCommand(detail.location.biome.code, resolvePreviousEnemyPageNumber(detail)),
          color: Keyboard.SECONDARY_COLOR,
        },
        {
          label: 'Следы ▶',
          command: createBestiaryLocationCommand(detail.location.biome.code, resolveNextEnemyPageNumber(detail)),
          color: Keyboard.SECONDARY_COLOR,
        },
      ] as const]
    : []
);

export const createBestiaryLocationKeyboard = (
  detail: BestiaryLocationDetailView,
): KeyboardBuilder => buildKeyboard([
  ...createLocationRewardRows(detail),
  ...createEnemyRows(detail),
  ...createEnemyPageRows(detail),
  [
    {
      label: '◀ К локациям',
      command: createBestiaryPageCommand(detail.locationPageNumber),
      color: Keyboard.SECONDARY_COLOR,
    },
  ],
  [
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
]);

export const createBestiaryEnemyKeyboard = (
  detail: BestiaryEnemyDetailView,
): KeyboardBuilder => buildKeyboard([
  ...(hasClaimableEnemyReward(detail)
    ? [[{
        label: '🎁 Забрать награду',
        command: createBestiaryEnemyRewardCommand(detail.location.biome.code, detail.enemy.template.code),
        color: Keyboard.POSITIVE_COLOR,
      }]]
    : []),
  [
    {
      label: '◀ К следам',
      command: createBestiaryLocationCommand(detail.location.biome.code, detail.enemyPageNumber),
      color: Keyboard.SECONDARY_COLOR,
    },
  ],
  [
    {
      label: '◀ К локациям',
      command: createBestiaryPageCommand(detail.locationPageNumber),
      color: Keyboard.SECONDARY_COLOR,
    },
    { label: '◀ Главное меню', command: gameCommands.backToMenu, color: Keyboard.SECONDARY_COLOR },
  ],
]);
