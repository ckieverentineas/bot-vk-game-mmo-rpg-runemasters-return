# Bestiary Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a quieter bestiary flow with five location cards per page, progress-gated location opening, exact-once Radiance rewards for first location discovery, and a separate mob detail screen with kill progress rewards.

**Architecture:** Keep bestiary rules in the world domain as pure read-model builders and reward descriptors. Keep exact-once persistence at the repository edge through `RewardLedgerRecord`, while VK handlers only route, render, and expose inline navigation.

**Tech Stack:** TypeScript, Vitest, Prisma, VK Bot API keyboard builders.

---

## File Structure

- Modify `src/modules/world/domain/bestiary.ts`: define overview/detail read models, unlock logic, first-open Radiance rewards, kill milestone reward descriptors, and builders.
- Modify `src/modules/world/domain/bestiary.test.ts`: cover page size, progress locks, first-open reward metadata, selected-location mob detail, and kill milestone display.
- Create `src/modules/shared/domain/contracts/bestiary-location-discovery-ledger.ts`: source type and ledger helpers for location discovery rewards.
- Create `src/modules/shared/domain/contracts/bestiary-enemy-kill-milestone-ledger.ts`: source type and ledger helpers for kill milestone rewards.
- Modify `src/modules/shared/application/ports/GameRepository.ts`: expose victory counts, claimed location rewards, claimed kill milestones, and claim methods.
- Modify `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`: implement ledger reads and idempotent reward claims.
- Modify `src/modules/world/application/use-cases/GetBestiary.ts`: claim newly unlocked location rewards before building overview; claim qualified kill milestone rewards for selected location.
- Modify `src/vk/commands/catalog.ts`: add `бестиарий локация <biomeCode>` command helpers.
- Modify `src/vk/handlers/routes/bestiaryCommandRoutes.ts`: route location commands before the generic bestiary route.
- Modify `src/vk/handlers/gameHandler.ts`: add `openBestiaryLocation`.
- Modify `src/vk/handlers/responders/bestiaryReplyFlow.ts`: reply with overview or location detail.
- Modify `src/vk/presenters/bestiaryMessages.ts`: render overview without mob lists; render location detail with mob progress and rewards.
- Modify `src/vk/keyboards/bestiary.ts`: add location buttons and back-to-overview keyboard.
- Modify VK tests around presenters, keyboards, and handler smoke behavior.

## Tasks

### Task 1: Domain Bestiary Read Models

**Files:**
- Modify: `src/modules/world/domain/bestiary.ts`
- Test: `src/modules/world/domain/bestiary.test.ts`

- [ ] **Step 1: Write failing domain tests**

Add tests that describe the target read models:

```ts
it('shows five location summaries without enemy rows', () => {
  const view = buildBestiaryOverviewView({
    biomes,
    listMobTemplatesForBiome,
    discovery,
    pageNumber: 1,
    highestLocationLevel: 16,
    claimedLocationRewardCodes: [],
    newlyClaimedLocationRewardCodes: [],
  });

  expect(view.locations).toHaveLength(5);
  expect(view.locations[0]).not.toHaveProperty('enemies');
  expect(view.locations.map((location) => location.discoveryReward.reward.radiance)).toEqual([1, 2, 3, 4, 5]);
  expect(view.locations.map((location) => location.isUnlocked)).toEqual([true, true, true, false, false]);
});

it('builds selected location enemy detail with kill milestone progress', () => {
  const view = buildBestiaryLocationDetailView({
    biomeCode: 'initium',
    biomes,
    listMobTemplatesForBiome,
    discovery: {
      discoveredEnemyCodes: ['training-spark'],
      rewardedEnemyCodes: ['training-spark'],
      enemyVictoryCounts: [{ enemyCode: 'training-spark', victoryCount: 5 }],
      claimedKillMilestones: [{ enemyCode: 'training-spark', threshold: 1 }],
    },
    highestLocationLevel: 0,
    claimedLocationRewardCodes: ['initium'],
    newlyClaimedLocationRewardCodes: [],
    newlyClaimedKillMilestones: [{ enemyCode: 'training-spark', threshold: 5 }],
  });

  expect(view.location.biome.code).toBe('initium');
  expect(view.enemies[0].victoryCount).toBe(5);
  expect(view.enemies[0].killMilestones[1]).toMatchObject({ threshold: 5, isClaimed: true, claimedNow: true });
});
```

- [ ] **Step 2: Run the domain tests and verify they fail**

Run: `npm test -- src/modules/world/domain/bestiary.test.ts`

Expected: FAIL because `buildBestiaryOverviewView`, `buildBestiaryLocationDetailView`, reward fields, and kill milestone fields do not exist.

- [ ] **Step 3: Implement the pure domain builders**

Add explicit read model types, `resolveBestiaryLocationDiscoveryReward`, `resolveBestiaryKillMilestoneReward`, `isBestiaryLocationUnlocked`, and builders that do not perform persistence.

- [ ] **Step 4: Run the domain tests and verify they pass**

Run: `npm test -- src/modules/world/domain/bestiary.test.ts`

Expected: PASS.

### Task 2: Exact-Once Ledger Contracts And Repository

**Files:**
- Create: `src/modules/shared/domain/contracts/bestiary-location-discovery-ledger.ts`
- Create: `src/modules/shared/domain/contracts/bestiary-enemy-kill-milestone-ledger.ts`
- Modify: `src/modules/shared/application/ports/GameRepository.ts`
- Modify: `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`
- Test: nearest existing Prisma repository test file, or add focused tests if the repository has no current bestiary ledger coverage.

- [ ] **Step 1: Write failing repository tests**

Cover both ledgers:

```ts
expect(await repository.claimBestiaryLocationDiscoveryReward(player.id, 'initium', { radiance: 1 })).toMatchObject({
  claimed: true,
  reward: { radiance: 1 },
});

expect(await repository.claimBestiaryLocationDiscoveryReward(player.id, 'initium', { radiance: 1 })).toMatchObject({
  claimed: false,
  reward: { radiance: 0 },
});
```

Also assert `listBestiaryDiscovery(player.id).enemyVictoryCounts` counts only applied battle reward ledger rows and `claimedLocationRewardCodes` includes `initium`.

- [ ] **Step 2: Run the focused repository tests and verify they fail**

Run the focused repository command used by the existing test file, for example:

`npm test -- src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`

Expected: FAIL because the repository port and Prisma implementation do not expose the new methods.

- [ ] **Step 3: Add ledger helpers and repository methods**

Use `RewardLedgerRecord` source types:

```ts
export const bestiaryLocationDiscoveryRewardSourceType = 'BESTIARY_LOCATION_DISCOVERY' as const;

export const createBestiaryLocationDiscoveryRewardSourceId = (playerId: string, biomeCode: string): string =>
  `bestiary_location:${playerId}:${biomeCode}`;
```

```ts
export const bestiaryEnemyKillMilestoneRewardSourceType = 'BESTIARY_ENEMY_KILL_MILESTONE' as const;

export const createBestiaryEnemyKillMilestoneRewardSourceId = (
  playerId: string,
  enemyCode: string,
  threshold: number,
): string => `bestiary_kill:${playerId}:${enemyCode}:${threshold}`;
```

Repository methods create an applied `RewardLedgerRecord` in the same transaction as `applyResourceReward`; duplicate ledger keys return `claimed: false` with an empty reward.

- [ ] **Step 4: Run the focused repository tests and verify they pass**

Run: `npm test -- src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`

Expected: PASS.

### Task 3: Bestiary Use Case Orchestration

**Files:**
- Modify: `src/modules/world/application/use-cases/GetBestiary.ts`
- Modify: use case tests if present; otherwise add coverage to `src/vk/handlers/gameHandler.smoke.test.ts`

- [ ] **Step 1: Write failing use case tests**

Assert overview claims newly unlocked location rewards once:

```ts
await useCase.execute(vkId, 1);
expect(repository.claimBestiaryLocationDiscoveryReward).toHaveBeenCalledWith(player.id, 'initium', { radiance: 1 });

await useCase.execute(vkId, 1);
expect(secondView.locations[0].discoveryReward.claimedNow).toBe(false);
```

Assert location detail claims qualified kill milestones once for visible enemies:

```ts
const detail = await useCase.executeLocation(vkId, 'initium');
expect(detail.enemies[0].killMilestones.find((milestone) => milestone.threshold === 5)?.claimedNow).toBe(true);
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run the focused test command for the use case or handler smoke file.

Expected: FAIL because `executeLocation` and claim orchestration do not exist.

- [ ] **Step 3: Implement orchestration**

`execute` loads player/discovery, claims unlocked visible location discovery rewards, reloads discovery, and returns overview. `executeLocation` validates the biome is unlocked, claims qualified enemy kill milestones for that biome, reloads discovery, and returns detail.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run the same focused command.

Expected: PASS.

### Task 4: VK Commands, Presentation, And Navigation

**Files:**
- Modify: `src/vk/commands/catalog.ts`
- Modify: `src/vk/handlers/routes/bestiaryCommandRoutes.ts`
- Modify: `src/vk/handlers/gameHandler.ts`
- Modify: `src/vk/handlers/responders/bestiaryReplyFlow.ts`
- Modify: `src/vk/presenters/bestiaryMessages.ts`
- Modify: `src/vk/keyboards/bestiary.ts`
- Test: `src/vk/presenters/bestiaryMessages.test.ts`
- Test: `src/vk/keyboards/bestiary.test.ts`
- Test: `src/vk/handlers/gameHandler.smoke.test.ts`

- [ ] **Step 1: Write failing VK tests**

Presenter overview should include location progress and first-open reward, but not enemy names:

```ts
const message = renderBestiaryOverview(view);
expect(message).toContain('Порог Инициации');
expect(message).toContain('Первое открытие: ✨ 1');
expect(message).not.toContain('Учебный огонек');
```

Keyboard should expose open location commands:

```ts
expect(buttonPayloads).toContain('бестиарий локация initium');
```

Handler should route dynamic location commands:

```ts
await routeBestiaryCommand(ctx, services, 1001, 'бестиарий локация initium');
expect(services.getBestiary.executeLocation).toHaveBeenCalledWith(1001, 'initium');
```

- [ ] **Step 2: Run focused VK tests and verify they fail**

Run:

`npm test -- src/vk/presenters/bestiaryMessages.test.ts src/vk/keyboards/bestiary.test.ts src/vk/handlers/gameHandler.smoke.test.ts`

Expected: FAIL because overview/detail renderers, location buttons, and route are missing.

- [ ] **Step 3: Implement VK command helpers and renderers**

Add command helpers:

```ts
export const bestiaryLocationCommandPrefix = 'бестиарий локация ';

export const createBestiaryLocationCommand = (biomeCode: string): string =>
  `${bestiaryLocationCommandPrefix}${biomeCode}`;

export const resolveBestiaryLocationCommand = (command: string): string | null => {
  const trimmedCommand = command.trim();
  return trimmedCommand.startsWith(bestiaryLocationCommandPrefix)
    ? trimmedCommand.slice(bestiaryLocationCommandPrefix.length).trim()
    : null;
};
```

Render overview as five location summaries, and render detail as mob rows with drop reveal, victory count, and kill milestone reward state.

- [ ] **Step 4: Run focused VK tests and verify they pass**

Run:

`npm test -- src/vk/presenters/bestiaryMessages.test.ts src/vk/keyboards/bestiary.test.ts src/vk/handlers/gameHandler.smoke.test.ts`

Expected: PASS.

### Task 5: Full Verification

**Files:**
- No direct code changes unless verification reveals a defect.

- [ ] **Step 1: Run typecheck and full local gate**

Run: `npm run check`

Expected: PASS with typecheck, content validation, build, and test suite green.

- [ ] **Step 2: Review git diff**

Run: `git diff --stat` and `git diff --check`

Expected: no whitespace errors; changes limited to bestiary domain, persistence, VK routes/presenters/keyboards/tests, and this plan.

- [ ] **Step 3: Commit implementation**

```bash
git add docs/superpowers/plans/2026-04-23-bestiary-progression.md src
git commit -m "feat: add bestiary progression rewards"
```

Expected: one implementation commit on `codex/bestiary-progression`.

## Self-Review

- Spec coverage: overview has five locations, progress locks, first-open Radiance rewards, selected-location mob detail, kill rewards, and no mastery milestone noise.
- Placeholder scan: no `TBD`, `TODO`, or vague "implement later" steps remain.
- Type consistency: overview/detail functions, repository method names, command helpers, and presenter names are consistent across tasks.
