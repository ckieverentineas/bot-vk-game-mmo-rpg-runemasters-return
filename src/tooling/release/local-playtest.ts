import { randomUUID } from 'node:crypto';

import { createAppServices, type AppServices } from '../../app/composition-root';
import { gameContent } from '../../content/game-content';
import { buildWorldCatalog } from '../../content/world';
import { prisma } from '../../database/client';
import { buildBattleActionIntentStateKey } from '../../modules/combat/application/command-intent-state';
import { buildEnterTutorialModeIntentStateKey, buildExploreLocationIntentStateKey } from '../../modules/exploration/application/command-intent-state';
import { ExploreLocation } from '../../modules/exploration/application/use-cases/ExploreLocation';
import { ExploreParty } from '../../modules/party/application/use-cases/ExploreParty';
import {
  findBestRuneOfSchoolAtLeastRarity,
  getSchoolNovicePathDefinition,
} from '../../modules/player/domain/school-novice-path';
import type { QuestCode } from '../../modules/quests/domain/quest-definitions';
import { buildEquipIntentStateKey, buildSelectRunePageSlotIntentStateKey } from '../../modules/runes/application/command-intent-state';
import type { RunePageSlot } from '../../modules/runes/domain/rune-collection';
import { PrismaGameRepository } from '../../modules/shared/infrastructure/prisma/PrismaGameRepository';
import type { GameRandom } from '../../shared/domain/GameRandom';
import type { PendingRewardView } from '../../modules/shared/application/ports/GameRepository';
import { derivePlayerStats, resolveAutoEquipRuneSlot, resolveMaxMana } from '../../modules/player/domain/player-stats';
import type { BattleView, PlayerState, RuneRarity } from '../../shared/types/game';
import {
  createPartyJoinCommand,
  createBestiaryEnemyCommand,
  createBestiaryEnemyRewardCommand,
  createBestiaryLocationCommand,
  createBestiaryLocationRewardCommand,
  gameCommands,
  resolveTrophyActionCodeCommand,
} from '../../vk/commands/catalog';
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
  questRewardReplaySafe: boolean | null;
  partyVictoryChecked: boolean;
  partyIdleAutoAttackChecked: boolean;
  partyReturnToExplorationChecked: boolean;
}

interface LocalPlaytestActor {
  readonly vkId: number;
  readonly peerId: number;
  readonly label: string;
}

const maxBattleTurns = 30;
const awakeningQuestCode = 'awakening_empty_master' satisfies QuestCode;
const schoolNoviceEvidenceIntentIdPrefix = 'local-playtest:school-novice-evidence';
const runePageSlotCommands = [
  gameCommands.selectRuneSlot1,
  gameCommands.selectRuneSlot2,
  gameCommands.selectRuneSlot3,
  gameCommands.selectRuneSlot4,
  gameCommands.selectRuneSlot5,
] as const;

const schoolNoviceEvidencePaths = [
  {
    schoolCode: 'ember',
    enemyCode: 'ash-seer',
    usualRuneName: 'Обычная руна Пламени',
    passiveAbilityCodes: ['ember_heart'],
    activeAbilityCodes: ['ember_pulse'],
    usualRuneStats: {
      health: 2,
      attack: 2,
      defence: 0,
      magicDefence: 0,
      dexterity: 0,
      intelligence: 0,
    },
  },
  {
    schoolCode: 'stone',
    enemyCode: 'stonehorn-ram',
    usualRuneName: 'Обычная руна Тверди',
    passiveAbilityCodes: ['stone_guard'],
    activeAbilityCodes: ['stone_bastion'],
    usualRuneStats: {
      health: 4,
      attack: 2,
      defence: 3,
      magicDefence: 1,
      dexterity: 0,
      intelligence: 0,
    },
  },
  {
    schoolCode: 'gale',
    enemyCode: 'storm-lynx',
    usualRuneName: 'Обычная руна Бури',
    passiveAbilityCodes: [],
    activeAbilityCodes: ['gale_step'],
    usualRuneStats: {
      health: 2,
      attack: 3,
      defence: 0,
      magicDefence: 0,
      dexterity: 3,
      intelligence: 0,
    },
  },
  {
    schoolCode: 'echo',
    enemyCode: 'blind-augur',
    usualRuneName: 'Обычная руна Прорицания',
    passiveAbilityCodes: ['echo_mind'],
    activeAbilityCodes: [],
    usualRuneStats: {
      health: 2,
      attack: 0,
      defence: 0,
      magicDefence: 3,
      dexterity: 0,
      intelligence: 3,
    },
  },
] as const satisfies readonly LocalPlaytestNoviceEvidencePath[];

const inventoryFields = [
  'usualShards',
  'unusualShards',
  'rareShards',
  'epicShards',
  'legendaryShards',
  'mythicalShards',
  'leather',
  'bone',
  'herb',
  'essence',
  'metal',
  'crystal',
] satisfies readonly (keyof PlayerState['inventory'])[];

interface ResourceSnapshot {
  readonly gold: number;
  readonly inventory: Readonly<PlayerState['inventory']>;
}

interface LocalPlaytestRuneStats {
  readonly health: number;
  readonly attack: number;
  readonly defence: number;
  readonly magicDefence: number;
  readonly dexterity: number;
  readonly intelligence: number;
}

interface LocalPlaytestNoviceEvidencePath {
  readonly schoolCode: 'ember' | 'stone' | 'gale' | 'echo';
  readonly enemyCode: string;
  readonly usualRuneName: string;
  readonly passiveAbilityCodes: readonly string[];
  readonly activeAbilityCodes: readonly string[];
  readonly usualRuneStats: LocalPlaytestRuneStats;
}

const createSyntheticVkId = (): number => (
  910_000_000 + Math.floor(Math.random() * 1_000_000)
);

const createPeerId = (vkId: number): number => 2_000_000_000 + (vkId % 100_000);

const createActor = (label: string, vkId = createSyntheticVkId()): LocalPlaytestActor => ({
  vkId,
  peerId: createPeerId(vkId),
  label,
});

const createRuntime = (scenarioName: ScenarioName): LocalPlaytestRuntime => {
  const actor = createActor('main');
  const services = createAppServices();

  return {
    scenarioName,
    vkId: actor.vkId,
    peerId: actor.peerId,
    services,
    handler: new GameHandler(services),
    transcript: [],
    messageId: 7_000,
    questRewardReplaySafe: null,
    partyVictoryChecked: false,
    partyIdleAutoAttackChecked: false,
    partyReturnToExplorationChecked: false,
  };
};

const createSchoolNoviceEvidenceRandom = (): GameRandom => ({
  nextInt: (_min: number, max: number): number => max,
  rollPercentage: (chancePercent: number): boolean => chancePercent === 50 || chancePercent === 45,
  pickOne: <T>(items: readonly T[]): T => items[0] as T,
});

const createPartyBattleRandom = (): GameRandom => ({
  nextInt: (_min: number, max: number): number => max,
  rollPercentage: (): boolean => false,
  pickOne: <T>(items: readonly T[]): T => items[0] as T,
});

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

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => (
  typeof value === 'object' && value !== null
);

const selectMeaningfulReply = (
  replies: readonly { readonly message: string; readonly options: unknown }[],
): { readonly message: string; readonly options: unknown } | null => {
  for (let index = replies.length - 1; index >= 0; index -= 1) {
    const reply = replies[index];
    if (reply.message.trim() !== '\u2063') {
      return reply;
    }
  }

  return replies[0] ?? null;
};

const listSerializedKeyboardButtons = (keyboard: unknown): readonly unknown[] => {
  const serialized = JSON.parse(JSON.stringify(keyboard)) as unknown;
  if (!isRecord(serialized)) {
    return [];
  }

  const rows = Array.isArray(serialized.rows) ? serialized.rows : [];
  const currentRow = Array.isArray(serialized.currentRow) ? [serialized.currentRow] : [];

  return [...rows, ...currentRow].flatMap((row) => Array.isArray(row) ? row : []);
};

const parseKeyboardPayloadCommand = (payload: unknown): string | null => {
  if (typeof payload !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    return isRecord(parsed) && typeof parsed.command === 'string' ? parsed.command : null;
  } catch {
    return null;
  }
};

const extractKeyboardSnapshot = (
  options: unknown,
): Pick<LocalPlaytestTranscriptEntry, 'keyboardCommands' | 'keyboardLabels'> => {
  if (!isRecord(options) || !('keyboard' in options)) {
    return {};
  }

  const buttons = listSerializedKeyboardButtons(options.keyboard);
  const labels = buttons
    .map((button) => isRecord(button) && isRecord(button.action) ? button.action.label : null)
    .filter((label): label is string => typeof label === 'string');
  const commands = buttons
    .map((button) => (
      isRecord(button) && isRecord(button.action)
        ? parseKeyboardPayloadCommand(button.action.payload)
        : null
    ))
    .filter((command): command is string => command !== null);

  return {
    ...(commands.length > 0 ? { keyboardCommands: commands } : {}),
    ...(labels.length > 0 ? { keyboardLabels: labels } : {}),
  };
};

const runCommand = async (
  runtime: LocalPlaytestRuntime,
  label: string,
  command: string,
  stateKey?: string,
): Promise<string> => runCommandAs(
  runtime,
  { vkId: runtime.vkId, peerId: runtime.peerId, label: 'main' },
  label,
  command,
  stateKey,
);

const runCommandAs = async (
  runtime: LocalPlaytestRuntime,
  actor: LocalPlaytestActor,
  label: string,
  command: string,
  stateKey?: string,
): Promise<string> => {
  runtime.messageId += 1;

  const payload = createPayload(runtime, command, stateKey);
  const context = createLocalPlaytestContext({
    vkId: actor.vkId,
    peerId: actor.peerId,
    messageId: runtime.messageId,
    command,
    payload,
  });

  await runtime.handler.handle(context as never);

  const replyRecord = selectMeaningfulReply(context.replies);
  const reply = replyRecord?.message ?? '<no reply>';
  runtime.transcript.push({
    label,
    command,
    payload,
    reply,
    ...extractKeyboardSnapshot(replyRecord?.options),
  });

  console.log(`\n[${runtime.scenarioName}:${actor.label}] ${label}: ${command}`);
  console.log(previewReply(reply));

  return reply;
};

const getPlayerByVkId = async (runtime: LocalPlaytestRuntime, vkId: number): Promise<PlayerState> => (
  runtime.services.getPlayerProfile.execute(vkId)
);

const getPlayer = async (runtime: LocalPlaytestRuntime): Promise<PlayerState> => (
  getPlayerByVkId(runtime, runtime.vkId)
);

const getActiveBattleByVkId = async (
  runtime: LocalPlaytestRuntime,
  vkId: number,
): Promise<BattleView | null> => {
  try {
    return await runtime.services.getActiveBattle.execute(vkId);
  } catch {
    return null;
  }
};

const getActiveBattle = async (runtime: LocalPlaytestRuntime): Promise<BattleView | null> => (
  getActiveBattleByVkId(runtime, runtime.vkId)
);

const getPendingRewardByVkId = async (
  runtime: LocalPlaytestRuntime,
  vkId: number,
): Promise<PendingRewardView | null> => {
  const result = await runtime.services.getPendingReward.execute(vkId);
  return result.pendingReward;
};

const getPendingReward = async (runtime: LocalPlaytestRuntime): Promise<PendingRewardView | null> => (
  getPendingRewardByVkId(runtime, runtime.vkId)
);

const restoreLocalPlaytestVitalsByVkId = async (
  runtime: LocalPlaytestRuntime,
  vkId: number,
): Promise<PlayerState> => {
  const player = await getPlayerByVkId(runtime, vkId);
  const stats = derivePlayerStats(player);

  await prisma.playerProgress.update({
    where: { playerId: player.playerId },
    data: {
      currentHealth: Math.max(1, stats.health),
      currentMana: resolveMaxMana(stats),
    },
  });

  return getPlayerByVkId(runtime, vkId);
};

const restoreLocalPlaytestVitals = async (runtime: LocalPlaytestRuntime): Promise<PlayerState> => (
  restoreLocalPlaytestVitalsByVkId(runtime, runtime.vkId)
);

const createResourceSnapshot = (player: PlayerState): ResourceSnapshot => ({
  gold: player.gold,
  inventory: { ...player.inventory },
});

const areResourceSnapshotsEqual = (left: ResourceSnapshot, right: ResourceSnapshot): boolean => (
  left.gold === right.gold
  && inventoryFields.every((field) => left.inventory[field] === right.inventory[field])
);

const assertReplyIncludes = (
  reply: string,
  label: string,
  expectedFragments: readonly string[],
): void => {
  const missingFragments = expectedFragments.filter((fragment) => !reply.includes(fragment));

  if (missingFragments.length === 0) {
    return;
  }

  throw new Error(`${label} reply is missing expected fragments: ${missingFragments.join(', ')}`);
};

const resolveLocalRunePageSlot = (
  player: PlayerState,
  path: LocalPlaytestNoviceEvidencePath,
  minimumRarity: RuneRarity,
): RunePageSlot => {
  const rune = findBestRuneOfSchoolAtLeastRarity(player, path.schoolCode, minimumRarity);
  if (!rune) {
    throw new Error(`${path.schoolCode} evidence path expected a ${minimumRarity} school rune.`);
  }

  const runeIndex = player.runes.findIndex((candidate) => candidate.id === rune.id);
  if (runeIndex < 0 || runeIndex >= runePageSlotCommands.length) {
    throw new Error(`${path.schoolCode} evidence path cannot select rune index ${runeIndex} in the local page.`);
  }

  return runeIndex as RunePageSlot;
};

const selectAndEquipSchoolRune = async (
  runtime: LocalPlaytestRuntime,
  path: LocalPlaytestNoviceEvidencePath,
  minimumRarity: RuneRarity,
  label: string,
): Promise<void> => {
  const runeListPlayer = await getPlayer(runtime);
  const pageSlot = resolveLocalRunePageSlot(runeListPlayer, path, minimumRarity);
  await runCommand(
    runtime,
    `${path.schoolCode}-${label}-select`,
    runePageSlotCommands[pageSlot],
    buildSelectRunePageSlotIntentStateKey(runeListPlayer, pageSlot),
  );

  const selectedRunePlayer = await getPlayer(runtime);
  const targetSlot = runtime.scenarioName === 'payload'
    ? resolveAutoEquipRuneSlot(selectedRunePlayer)
    : 0;
  const equipCommand = runtime.scenarioName === 'payload'
    ? gameCommands.equipRune
    : gameCommands.equipRuneSlot1;
  await runCommand(
    runtime,
    `${path.schoolCode}-${label}-equip`,
    equipCommand,
    buildEquipIntentStateKey(selectedRunePlayer, targetSlot),
  );
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

const collectPendingRewardForActorIfAny = async (
  runtime: LocalPlaytestRuntime,
  actor: LocalPlaytestActor,
): Promise<void> => {
  const pendingReward = await getPendingRewardByVkId(runtime, actor.vkId);

  if (!pendingReward) {
    return;
  }

  const selectedAction = pendingReward.snapshot.trophyActions.find((action) => action.code !== 'claim_all')
    ?? pendingReward.snapshot.trophyActions[0];

  if (!selectedAction) {
    throw new Error('Pending reward has no trophy actions.');
  }

  await runCommandAs(
    runtime,
    actor,
    `${actor.label}-collect-${selectedAction.code}`,
    resolveTrophyActionCodeCommand(selectedAction.code),
    pendingReward.ledgerKey,
  );
};

const collectPendingRewardIfAny = async (runtime: LocalPlaytestRuntime): Promise<void> => {
  await collectPendingRewardForActorIfAny(
    runtime,
    { vkId: runtime.vkId, peerId: runtime.peerId, label: 'main' },
  );
};

type LocalPartyBattle = BattleView & { party: NonNullable<BattleView['party']> };

const requirePartyBattle = async (
  runtime: LocalPlaytestRuntime,
  actor: LocalPlaytestActor,
  label: string,
): Promise<LocalPartyBattle> => {
  const battle = await getActiveBattleByVkId(runtime, actor.vkId);

  if (!battle?.party) {
    throw new Error(`${label} expected an active party battle.`);
  }

  return battle as LocalPartyBattle;
};

const startDeterministicPartyBattle = async (
  runtime: LocalPlaytestRuntime,
  actor: LocalPlaytestActor,
): Promise<LocalPartyBattle> => {
  const repository = new PrismaGameRepository(prisma);
  const exploreParty = new ExploreParty(
    repository,
    buildWorldCatalog(gameContent.world),
    createPartyBattleRandom(),
  );
  const result = await exploreParty.execute(actor.vkId);

  if ('event' in result || !result.party) {
    throw new Error('Deterministic party playtest expected a battle result.');
  }

  const payload = createPayload(runtime, gameCommands.exploreParty);
  const reply = result.log.join('\n');
  runtime.transcript.push({
    label: 'party-explore-start',
    command: gameCommands.exploreParty,
    payload,
    reply,
  });

  console.log(`\n[${runtime.scenarioName}:${actor.label}] party-explore-start: ${gameCommands.exploreParty}`);
  console.log(previewReply(reply));

  return result as LocalPartyBattle;
};

const runBattleCommandForActor = async (
  runtime: LocalPlaytestRuntime,
  actor: LocalPlaytestActor,
  battle: BattleView,
  label: string,
): Promise<string> => {
  const battleCommand = chooseBattleCommand(battle);
  const stateKey = runtime.scenarioName === 'payload'
    ? buildBattleActionIntentStateKey(battle, battleCommand.action)
    : undefined;

  return runCommandAs(runtime, actor, label, battleCommand.command, stateKey);
};

const getPartyBattleTurnActor = (
  battle: LocalPartyBattle,
  actorsByPlayerId: ReadonlyMap<number, LocalPlaytestActor>,
): LocalPlaytestActor => {
  const currentTurnPlayerId = battle.party.currentTurnPlayerId ?? battle.player.playerId;
  const actor = actorsByPlayerId.get(currentTurnPlayerId);

  if (!actor) {
    throw new Error(`Party battle turn actor ${currentTurnPlayerId} is not in the local playtest map.`);
  }

  return actor;
};

const fightPartyBattleUntilFinished = async (
  runtime: LocalPlaytestRuntime,
  leaderActor: LocalPlaytestActor,
  actorsByPlayerId: ReadonlyMap<number, LocalPlaytestActor>,
  labelPrefix: string,
): Promise<void> => {
  for (let turn = 1; turn <= maxBattleTurns; turn += 1) {
    const battle = await getActiveBattleByVkId(runtime, leaderActor.vkId);
    if (!battle) {
      return;
    }

    if (!battle.party) {
      throw new Error(`${labelPrefix} expected a party battle.`);
    }

    const actor = getPartyBattleTurnActor(battle as LocalPartyBattle, actorsByPlayerId);
    await runBattleCommandForActor(runtime, actor, battle, `${labelPrefix}-${turn}`);
  }

  throw new Error(`${labelPrefix} did not finish within ${maxBattleTurns} turns.`);
};

const reinforcePartyBattleEnemy = async (battle: LocalPartyBattle): Promise<LocalPartyBattle> => {
  const repository = new PrismaGameRepository(prisma);
  const enemyMaxHealth = Math.max(battle.enemy.maxHealth, 90);
  const reinforced = await repository.saveBattle({
    ...battle,
    enemy: {
      ...battle.enemy,
      attack: Math.min(battle.enemy.attack, 2),
      maxHealth: enemyMaxHealth,
      currentHealth: enemyMaxHealth,
    },
  }, { actingPlayerId: battle.playerId });

  if (!reinforced.party) {
    throw new Error('Reinforced battle lost party metadata.');
  }

  return reinforced as LocalPartyBattle;
};

const markPartyBattleAsIdle = async (battle: LocalPartyBattle): Promise<void> => {
  await prisma.battleSession.update({
    where: { id: battle.id },
    data: { updatedAt: new Date(Date.now() - 31_000) },
  });
};

const prepareLocalPartyPlayer = async (
  runtime: LocalPlaytestRuntime,
  actor: LocalPlaytestActor,
): Promise<PlayerState> => {
  await runCommandAs(runtime, actor, `${actor.label}-start`, gameCommands.start);

  const player = await getPlayerByVkId(runtime, actor.vkId);

  await prisma.$transaction([
    prisma.playerParty.updateMany({
      where: {
        leaderPlayerId: player.playerId,
        status: { in: ['OPEN', 'IN_BATTLE'] },
      },
      data: {
        status: 'COMPLETED',
        activeBattleId: null,
      },
    }),
    prisma.playerPartyMember.deleteMany({ where: { playerId: player.playerId } }),
    prisma.battleSession.deleteMany({ where: { playerId: player.playerId, status: 'ACTIVE' } }),
    prisma.rune.deleteMany({ where: { playerId: player.playerId } }),
    prisma.player.update({
      where: { id: player.playerId },
      data: {
        level: 3,
        experience: 0,
        baseHealth: 120,
        baseAttack: 14,
        baseDefence: 24,
        baseMagicDefence: 18,
        baseDexterity: 30,
        baseIntelligence: 8,
      },
    }),
    prisma.playerProgress.update({
      where: { playerId: player.playerId },
      data: {
        locationLevel: 1,
        highestLocationLevel: 1,
        currentRuneIndex: 0,
        activeBattleId: null,
        tutorialState: 'COMPLETED',
        victories: 0,
        victoryStreak: 0,
        defeats: 0,
        defeatStreak: 0,
        mobsKilled: 0,
      },
    }),
    prisma.rune.create({
      data: {
        playerId: player.playerId,
        runeCode: `local-playtest-party-${actor.label}-${actor.vkId}`,
        archetypeCode: 'stone',
        passiveAbilityCodes: JSON.stringify([]),
        activeAbilityCodes: JSON.stringify([]),
        name: 'Local playtest party rune',
        rarity: 'USUAL',
        health: 8,
        attack: 2,
        defence: 2,
        magicDefence: 2,
        dexterity: 0,
        intelligence: 0,
        isEquipped: true,
        equippedSlot: 0,
      },
    }),
  ]);

  return restoreLocalPlaytestVitalsByVkId(runtime, actor.vkId);
};

const runPartyStabilityScenario = async (runtime: LocalPlaytestRuntime): Promise<void> => {
  const leaderActor = createActor('party-leader');
  const allyActor = createActor('party-ally');
  const leader = await prepareLocalPartyPlayer(runtime, leaderActor);
  const ally = await prepareLocalPartyPlayer(runtime, allyActor);
  const actorsByPlayerId = new Map<number, LocalPlaytestActor>([
    [leader.playerId, leaderActor],
    [ally.playerId, allyActor],
  ]);

  await runCommandAs(runtime, leaderActor, 'party-create', gameCommands.createParty);
  const partyScreen = await runtime.services.getParty.execute(leaderActor.vkId);
  const inviteCode = partyScreen.party?.inviteCode;
  if (!inviteCode) {
    throw new Error('Local party playtest expected a fresh invite code.');
  }

  await runCommandAs(runtime, allyActor, 'party-join', createPartyJoinCommand(inviteCode));

  let battle = await reinforcePartyBattleEnemy(
    await startDeterministicPartyBattle(runtime, leaderActor),
  );

  if (battle.encounter?.status === 'OFFERED') {
    await runBattleCommandForActor(runtime, leaderActor, battle, 'party-engage');
    battle = await requirePartyBattle(runtime, leaderActor, 'Party engage');
  }

  if (battle.party.currentTurnPlayerId === leader.playerId) {
    await runBattleCommandForActor(runtime, leaderActor, battle, 'party-leader-first-action');
    battle = await requirePartyBattle(runtime, leaderActor, 'Party leader first action');
  }

  if (battle.party.currentTurnPlayerId !== ally.playerId) {
    throw new Error('Local party playtest expected the ally turn before idle auto-attack.');
  }

  await markPartyBattleAsIdle(battle);
  const idleBattle = await requirePartyBattle(runtime, leaderActor, 'Party idle auto attack');
  const idleStateKey = runtime.scenarioName === 'payload'
    ? buildBattleActionIntentStateKey(idleBattle, 'ATTACK')
    : undefined;
  const autoAttackReply = await runCommandAs(
    runtime,
    leaderActor,
    'party-idle-auto-attack',
    gameCommands.attack,
    idleStateKey,
  );
  assertReplyIncludes(autoAttackReply, 'Party idle auto attack', ['автоатака']);
  runtime.partyIdleAutoAttackChecked = true;

  await fightPartyBattleUntilFinished(runtime, leaderActor, actorsByPlayerId, 'party-finish');
  await collectPendingRewardForActorIfAny(runtime, leaderActor);
  await collectPendingRewardForActorIfAny(runtime, allyActor);

  const leaderAfterVictory = await getPlayerByVkId(runtime, leaderActor.vkId);
  if (leaderAfterVictory.victories <= leader.victories) {
    throw new Error('Local party playtest expected a recorded party victory.');
  }
  runtime.partyVictoryChecked = true;

  await runCommandAs(runtime, leaderActor, 'party-return-explore', gameCommands.exploreParty);
  const returnBattle = await getActiveBattleByVkId(runtime, leaderActor.vkId);
  runtime.partyReturnToExplorationChecked = true;

  if (returnBattle?.party) {
    await fightPartyBattleUntilFinished(runtime, leaderActor, actorsByPlayerId, 'party-return-finish');
    await collectPendingRewardForActorIfAny(runtime, leaderActor);
    await collectPendingRewardForActorIfAny(runtime, allyActor);
  }
};

const prepareSchoolNoviceEvidenceState = async (
  runtime: LocalPlaytestRuntime,
  path: LocalPlaytestNoviceEvidencePath,
): Promise<PlayerState> => {
  const player = await getPlayer(runtime);

  await prisma.$transaction([
    prisma.battleSession.deleteMany({ where: { playerId: player.playerId, status: 'ACTIVE' } }),
    prisma.commandIntentRecord.deleteMany({
      where: {
        playerId: player.playerId,
        intentId: { startsWith: schoolNoviceEvidenceIntentIdPrefix },
      },
    }),
    prisma.rune.deleteMany({ where: { playerId: player.playerId } }),
    prisma.player.update({
      where: { id: player.playerId },
      data: {
        level: 3,
        experience: 0,
        baseHealth: 120,
        baseAttack: 36,
        baseDefence: 18,
        baseMagicDefence: 18,
        baseDexterity: 20,
        baseIntelligence: 16,
      },
    }),
    prisma.playerProgress.update({
      where: { playerId: player.playerId },
      data: {
        locationLevel: 5,
        highestLocationLevel: 5,
        currentRuneIndex: 0,
        activeBattleId: null,
        tutorialState: 'COMPLETED',
        victories: Math.max(player.victories, 1),
        victoryStreak: 4,
        defeats: player.defeats,
        defeatStreak: 0,
        mobsKilled: player.mobsKilled,
      },
    }),
    prisma.playerSchoolMastery.upsert({
      where: {
        playerId_schoolCode: {
          playerId: player.playerId,
          schoolCode: path.schoolCode,
        },
      },
      update: {
        experience: 1,
        rank: 0,
      },
      create: {
        playerId: player.playerId,
        schoolCode: path.schoolCode,
        experience: 1,
        rank: 0,
      },
    }),
    prisma.rune.create({
      data: {
        playerId: player.playerId,
        runeCode: `local-playtest-${path.schoolCode}-usual-${runtime.vkId}`,
        archetypeCode: path.schoolCode,
        passiveAbilityCodes: JSON.stringify(path.passiveAbilityCodes),
        activeAbilityCodes: JSON.stringify(path.activeAbilityCodes),
        name: path.usualRuneName,
        rarity: 'USUAL',
        health: path.usualRuneStats.health,
        attack: path.usualRuneStats.attack,
        defence: path.usualRuneStats.defence,
        magicDefence: path.usualRuneStats.magicDefence,
        dexterity: path.usualRuneStats.dexterity,
        intelligence: path.usualRuneStats.intelligence,
        isEquipped: true,
        equippedSlot: 0,
      },
    }),
  ]);

  return restoreLocalPlaytestVitals(runtime);
};

const startSchoolEvidenceBattle = async (
  runtime: LocalPlaytestRuntime,
  path: LocalPlaytestNoviceEvidencePath,
  battleKind: 'novice' | 'miniboss',
  expectedEnemyCode: string,
): Promise<void> => {
  const player = await getPlayer(runtime);
  const repository = new PrismaGameRepository(prisma);
  const exploreLocation = new ExploreLocation(
    repository,
    buildWorldCatalog(gameContent.world),
    createSchoolNoviceEvidenceRandom(),
    runtime.services.telemetry,
  );
  const intentId = `${schoolNoviceEvidenceIntentIdPrefix}:${battleKind}:${path.schoolCode}:${runtime.scenarioName}:${runtime.vkId}`;
  const stateKey = buildExploreLocationIntentStateKey(player);
  const battle = await exploreLocation.execute(runtime.vkId, intentId, stateKey, 'payload');

  if ('event' in battle) {
    throw new Error(`${path.schoolCode} ${battleKind} evidence path resolved an exploration event instead of a battle.`);
  }

  const startedBattle = 'battle' in battle ? battle.battle : battle;
  runtime.transcript.push({
    label: `${path.schoolCode}-${battleKind}-evidence`,
    command: gameCommands.explore,
    payload: {
      command: gameCommands.explore,
      intentId,
      stateKey,
    },
    reply: startedBattle.log.join('\n'),
  });

  if (startedBattle.enemy.code !== expectedEnemyCode) {
    throw new Error(`${path.schoolCode} ${battleKind} evidence path expected ${expectedEnemyCode}, got ${startedBattle.enemy.code}.`);
  }
};

const runSchoolNoviceEvidencePath = async (
  runtime: LocalPlaytestRuntime,
  path: LocalPlaytestNoviceEvidencePath,
): Promise<void> => {
  await prepareSchoolNoviceEvidenceState(runtime, path);
  const novicePath = getSchoolNovicePathDefinition(path.schoolCode);
  const minibossEnemyCode = novicePath?.minibossEnemyCode;
  if (!novicePath || !minibossEnemyCode || !novicePath.minibossRewardRarity) {
    throw new Error(`${path.schoolCode} evidence path is missing miniboss continuation metadata.`);
  }

  await startSchoolEvidenceBattle(runtime, path, 'novice', path.enemyCode);

  await fightUntilFinished(runtime);
  await collectPendingRewardIfAny(runtime);
  await runCommand(runtime, `${path.schoolCode}-novice-rune-hub`, gameCommands.runeCollection);
  await selectAndEquipSchoolRune(runtime, path, novicePath.rewardRarity, 'sign');
  await restoreLocalPlaytestVitals(runtime);
  await startSchoolEvidenceBattle(runtime, path, 'miniboss', minibossEnemyCode);

  await fightUntilFinished(runtime);
  await collectPendingRewardIfAny(runtime);
};

const runQuestBookChecks = async (runtime: LocalPlaytestRuntime): Promise<void> => {
  const questBookReply = await runCommand(runtime, 'quest-book', gameCommands.questBook);
  assertReplyIncludes(questBookReply, 'Quest book', [
    '📜 Книга путей',
    'Пробуждение Пустого мастера',
    'Награда не собрана',
  ]);

  const questClaimReply = await runCommand(
    runtime,
    `quest-claim-${awakeningQuestCode}`,
    gameCommands.claimQuestReward,
    awakeningQuestCode,
  );
  assertReplyIncludes(questClaimReply, 'Quest reward claim', [
    '📜 Запись закрыта',
    'Пробуждение Пустого мастера',
    'В сумке:',
  ]);

  if (runtime.scenarioName !== 'payload') {
    return;
  }

  const afterClaimSnapshot = createResourceSnapshot(await getPlayer(runtime));
  const replayReply = await runCommand(
    runtime,
    `quest-claim-${awakeningQuestCode}-replay`,
    gameCommands.claimQuestReward,
    awakeningQuestCode,
  );
  const afterReplaySnapshot = createResourceSnapshot(await getPlayer(runtime));

  runtime.questRewardReplaySafe = areResourceSnapshotsEqual(afterClaimSnapshot, afterReplaySnapshot);
  assertReplyIncludes(replayReply, 'Quest reward replay', [
    '📜 Запись уже закрыта',
    'Новая добыча не добавлялась',
  ]);
};

const runBestiaryChecks = async (runtime: LocalPlaytestRuntime): Promise<void> => {
  const bestiaryReply = await runCommand(runtime, 'bestiary', gameCommands.bestiary);
  assertReplyIncludes(bestiaryReply, 'Bestiary', [
    '📖 Бестиарий',
    'Порог Инициации',
    '🧭 1/1',
    '🏁 +1 сияния · можно забрать',
  ]);

  const bestiaryLocationRewardReply = await runCommand(
    runtime,
    'bestiary-initium-location-reward',
    createBestiaryLocationRewardCommand('initium'),
  );
  assertReplyIncludes(bestiaryLocationRewardReply, 'Bestiary location reward', [
    '📖 Бестиарий / Порог Инициации',
    '+1 сияния · получено сейчас',
  ]);

  const bestiaryLocationReply = await runCommand(
    runtime,
    'bestiary-initium',
    createBestiaryLocationCommand('initium'),
  );
  assertReplyIncludes(bestiaryLocationReply, 'Bestiary location', [
    '📖 Бестиарий / Порог Инициации',
    'Учебный огонёк',
    '🐾 Следы 1/1',
    '🏆 1',
  ]);

  const bestiaryEnemyReply = await runCommand(
    runtime,
    'bestiary-training-wisp',
    createBestiaryEnemyCommand('initium', 'training-wisp'),
  );
  assertReplyIncludes(bestiaryEnemyReply, 'Bestiary enemy', [
    '📖 Бестиарий / Порог Инициации',
    'Учебный огонёк',
    '🏆 Побед: 1',
    '🎁 +1 эссенция',
  ]);

  const bestiaryEnemyRewardReply = await runCommand(
    runtime,
    'bestiary-training-wisp-reward',
    createBestiaryEnemyRewardCommand('initium', 'training-wisp'),
  );
  assertReplyIncludes(bestiaryEnemyRewardReply, 'Bestiary enemy reward', [
    '1 побед: +1 сияния · получено сейчас',
  ]);
};

const runReturnRecapCheck = async (runtime: LocalPlaytestRuntime): Promise<void> => {
  await runCommand(runtime, 'returning-start', gameCommands.start);
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
  await collectPendingRewardIfAny(runtime);
  await runBestiaryChecks(runtime);
  await runQuestBookChecks(runtime);
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

  for (const path of schoolNoviceEvidencePaths) {
    await runSchoolNoviceEvidencePath(runtime, path);
  }

  await runReturnRecapCheck(runtime);
  await runPartyStabilityScenario(runtime);

  const player = await getPlayer(runtime);
  const activeBattle = await getActiveBattle(runtime);
  const pendingReward = await getPendingReward(runtime);
  const logs = await prisma.gameLog.findMany({
    where: { userId: player.userId },
    orderBy: { createdAt: 'asc' },
    select: { action: true, details: true },
  });

  return buildLocalPlaytestSummary({
    scenarioName: runtime.scenarioName,
    vkId: runtime.vkId,
    player,
    activeBattle,
    pendingRewardOpen: pendingReward !== null,
    questRewardReplaySafe: runtime.questRewardReplaySafe,
    r0StabilityRequired: true,
    r1EarlyGameRequired: true,
    partyVictoryChecked: runtime.partyVictoryChecked,
    partyIdleAutoAttackChecked: runtime.partyIdleAutoAttackChecked,
    partyReturnToExplorationChecked: runtime.partyReturnToExplorationChecked,
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
