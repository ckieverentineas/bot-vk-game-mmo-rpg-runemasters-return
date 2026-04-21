import { randomUUID } from 'node:crypto';

import { createAppServices, type AppServices } from '../../app/composition-root';
import { prisma } from '../../database/client';
import { buildBattleActionIntentStateKey } from '../../modules/combat/application/command-intent-state';
import { buildEnterTutorialModeIntentStateKey, buildExploreLocationIntentStateKey } from '../../modules/exploration/application/command-intent-state';
import { buildEquipIntentStateKey, buildSelectRunePageSlotIntentStateKey } from '../../modules/runes/application/command-intent-state';
import type { BattleView, PlayerState } from '../../shared/types/game';
import { gameCommands } from '../../vk/commands/catalog';
import { GameHandler } from '../../vk/handlers/gameHandler';
import {
  buildLocalPlaytestSummary,
  chooseBattleCommand,
  createLocalPlaytestContext,
  listLocalPlaytestFailures,
  type LocalPlaytestPayload,
  type LocalPlaytestSummary,
  type LocalPlaytestTranscriptEntry,
} from './local-playtest-harness';

type ScenarioName = 'legacy-text' | 'payload';

interface LocalPlaytestRuntime {
  readonly scenarioName: ScenarioName;
  readonly vkId: number;
  readonly peerId: number;
  readonly services: AppServices;
  readonly handler: GameHandler;
  readonly transcript: LocalPlaytestTranscriptEntry[];
  messageId: number;
}

const maxBattleTurns = 20;

const createSyntheticVkId = (): number => (
  910_000_000 + Math.floor(Math.random() * 1_000_000)
);

const createRuntime = (scenarioName: ScenarioName): LocalPlaytestRuntime => {
  const vkId = createSyntheticVkId();
  const services = createAppServices();

  return {
    scenarioName,
    vkId,
    peerId: 2_000_000_000 + (vkId % 100_000),
    services,
    handler: new GameHandler(services),
    transcript: [],
    messageId: 7_000,
  };
};

const createPayload = (
  runtime: LocalPlaytestRuntime,
  command: string,
  stateKey?: string,
): LocalPlaytestPayload | null => {
  if (runtime.scenarioName === 'legacy-text') {
    return null;
  }

  return {
    command,
    ...(stateKey ? { intentId: randomUUID(), stateKey } : {}),
  };
};

const previewReply = (message: string, maxLines = 6): string => (
  message
    .split('\n')
    .slice(0, maxLines)
    .join('\n')
);

const runCommand = async (
  runtime: LocalPlaytestRuntime,
  label: string,
  command: string,
  stateKey?: string,
): Promise<string> => {
  runtime.messageId += 1;

  const payload = createPayload(runtime, command, stateKey);
  const context = createLocalPlaytestContext({
    vkId: runtime.vkId,
    peerId: runtime.peerId,
    messageId: runtime.messageId,
    command,
    payload,
  });

  await runtime.handler.handle(context as never);

  const reply = context.replies[0]?.message ?? '<no reply>';
  runtime.transcript.push({ label, command, payload, reply });

  console.log(`\n[${runtime.scenarioName}] ${label}: ${command}`);
  console.log(previewReply(reply));

  return reply;
};

const getPlayer = async (runtime: LocalPlaytestRuntime): Promise<PlayerState> => (
  runtime.services.getPlayerProfile.execute(runtime.vkId)
);

const getActiveBattle = async (runtime: LocalPlaytestRuntime): Promise<BattleView | null> => {
  try {
    return await runtime.services.getActiveBattle.execute(runtime.vkId);
  } catch {
    return null;
  }
};

const fightUntilFinished = async (runtime: LocalPlaytestRuntime): Promise<void> => {
  for (let turn = 1; turn <= maxBattleTurns; turn += 1) {
    const battle = await getActiveBattle(runtime);
    if (!battle) {
      return;
    }

    const battleCommand = chooseBattleCommand(battle);
    const stateKey = runtime.scenarioName === 'payload'
      ? buildBattleActionIntentStateKey(battle, battleCommand.action)
      : undefined;
    await runCommand(runtime, `battle-${turn}`, battleCommand.command, stateKey);
  }
};

const runFirstSessionScenario = async (runtime: LocalPlaytestRuntime): Promise<LocalPlaytestSummary> => {
  console.log(`\n=== Local playtest: ${runtime.scenarioName} ===`);
  console.log(`Synthetic vkId: ${runtime.vkId}`);

  await runCommand(runtime, 'start', gameCommands.start);

  const tutorialPlayer = await getPlayer(runtime);
  await runCommand(
    runtime,
    'tutorial-location',
    gameCommands.location,
    buildEnterTutorialModeIntentStateKey(tutorialPlayer),
  );

  const explorationPlayer = await getPlayer(runtime);
  await runCommand(
    runtime,
    'tutorial-explore',
    gameCommands.explore,
    buildExploreLocationIntentStateKey(explorationPlayer),
  );

  await fightUntilFinished(runtime);
  await runCommand(runtime, 'rune-hub', gameCommands.runeCollection);

  const runeListPlayer = await getPlayer(runtime);
  await runCommand(
    runtime,
    'select-first-rune',
    gameCommands.selectRuneSlot1,
    buildSelectRunePageSlotIntentStateKey(runeListPlayer, 0),
  );

  const selectedRunePlayer = await getPlayer(runtime);
  const equipCommand = runtime.scenarioName === 'payload'
    ? gameCommands.equipRune
    : gameCommands.equipRuneSlot1;
  await runCommand(
    runtime,
    'equip-first-rune',
    equipCommand,
    buildEquipIntentStateKey(selectedRunePlayer, 0),
  );

  await runCommand(runtime, 'profile', gameCommands.profile);

  const player = await getPlayer(runtime);
  const activeBattle = await getActiveBattle(runtime);
  const logs = await prisma.gameLog.findMany({
    where: { userId: player.userId },
    orderBy: { createdAt: 'asc' },
    select: { action: true },
  });

  return buildLocalPlaytestSummary({
    scenarioName: runtime.scenarioName,
    vkId: runtime.vkId,
    player,
    activeBattle,
    transcript: runtime.transcript,
    logs,
  });
};

const runLocalPlaytest = async (): Promise<readonly LocalPlaytestSummary[]> => {
  const scenarios: readonly ScenarioName[] = ['legacy-text', 'payload'];
  const summaries: LocalPlaytestSummary[] = [];

  for (const scenarioName of scenarios) {
    summaries.push(await runFirstSessionScenario(createRuntime(scenarioName)));
  }

  return summaries;
};

const printSummaries = (summaries: readonly LocalPlaytestSummary[]): void => {
  console.log('\n=== Local playtest summaries ===');
  console.log(JSON.stringify(summaries, null, 2));
};

const main = async (): Promise<void> => {
  const summaries = await runLocalPlaytest();
  const failures = summaries.flatMap((summary) => listLocalPlaytestFailures(summary));

  printSummaries(summaries);

  if (failures.length > 0) {
    console.error('\nLocal playtest failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('\nLocal playtest passed.');
};

main()
  .catch((error) => {
    console.error('\nLocal playtest crashed:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
