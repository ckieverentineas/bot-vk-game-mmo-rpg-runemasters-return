# Economy Loop v1 Blueprint Instances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static workshop blueprint stacks with unique blueprint instances so the workshop shows only real player-owned crafting opportunities and secret blueprints are earned through conditions, not bought with Сияние.

**Architecture:** This first Economy Loop v1 slice keeps the existing workshop catalog as a definition catalog, but moves player ownership to `PlayerBlueprintInstance`. Legacy `PlayerBlueprint` stacks remain as a compatibility source and are converted into instance rows. Crafting consumes a concrete `blueprintInstanceId`, while `Сияние` is reserved for awakening special features on already-owned eligible blueprints.

**Tech Stack:** TypeScript, Prisma, SQLite, Vitest, vk-io keyboard payloads.

---

## Scope Check

The full `Economy Loop v1` spec covers several subsystems: source/sink evidence, unique blueprint instances, secret discoveries, item quality, Сияние feature awakening, NPC purchases, and future exchange preparation. This plan implements the first standalone slice:

- unique player-owned blueprint instances;
- compatibility with current `PlayerBlueprint` stacks and `blueprintDelta`;
- workshop screens and buttons built from owned instances only;
- crafting by concrete blueprint instance;
- first secret blueprint grant path for `Набор свежевателя`;
- domain hooks for quality and future Сияние awakening without making Сияние the way to obtain secret blueprints.

NPC purchases and extended release evidence get their own follow-up plan after this slice is green.

## File Structure

- `src/modules/workshop/domain/workshop-blueprint-instances.ts`  
  Owns instance types, quality labels, legacy conversion, secret discovery rules, and craft guards.

- `src/modules/workshop/domain/workshop-blueprint-instances.test.ts`  
  Tests instance guards, legacy conversion, quality labels, and secret discovery rules.

- `src/shared/types/player.ts` and `src/modules/player/domain/player-skills.ts`  
  Add `crafting.workshop` as the skill that affects workshop item quality and repair.

- `src/modules/player/domain/player-skills.test.ts`  
  Locks the new skill definition.

- `prisma/schema.prisma` and `prisma/migrations/20260428190000_add_blueprint_instances/migration.sql`  
  Add `PlayerBlueprintInstance` and migrate existing `PlayerBlueprint` quantities into concrete rows.

- `src/modules/workshop/application/workshop-persistence.ts`  
  Adds `PlayerBlueprintInstanceView` and repository-facing mutation option types.

- `src/modules/shared/application/ports/GameRepository.ts`  
  Adds instance APIs and changes workshop craft to use `blueprintInstanceId`.

- `src/modules/shared/infrastructure/prisma/prisma-workshop-persistence.ts`  
  Maps blueprint instance records, grants instances, consumes one instance per craft, and keeps legacy stack APIs stable.

- `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`  
  Wires new persistence APIs and converts legacy `blueprintDelta` rewards into instance grants.

- `src/modules/workshop/application/workshop-view.ts`  
  Builds workshop view from owned instances instead of the full catalog.

- `src/modules/workshop/application/use-cases/GetWorkshop.test.ts`  
  Proves the workshop hides templates without owned instances.

- `src/modules/workshop/application/use-cases/CraftWorkshopItem.ts` and `.test.ts`  
  Crafts by `blueprintInstanceId`, validates ownership/status/materials, and replays safely.

- `src/modules/workshop/application/command-intent-state.ts`  
  Hashes instance ids/statuses instead of aggregate blueprint quantities for craft intents.

- `src/vk/commands/catalog.ts`  
  Parses workshop craft commands by instance id.

- `src/vk/keyboards/workshop.ts`  
  Emits craft buttons only for available instances.

- `src/vk/presenters/workshopMessages.ts` and `src/vk/presenters/workshopLabels.ts`  
  Shows blueprint instance rarity, quality, discovery source, and secret-discovery copy.

- `src/modules/world/domain/bestiary.ts` and `src/modules/world/application/use-cases/GetBestiary.ts`  
  Adds the first secret blueprint drop condition through a bestiary kill milestone reward.

- `src/shared/types/rewards.ts`, `src/shared/types/inventory.ts`, `src/modules/shared/domain/contracts/resource-reward-contract.ts`  
  Adds `blueprintDrops` while preserving legacy `blueprintDelta`.

- `src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`  
  Locks Prisma calls for blueprint instance grants and reward compatibility.

---

### Task 1: Domain Model For Blueprint Instances

**Files:**
- Create: `src/modules/workshop/domain/workshop-blueprint-instances.ts`
- Create: `src/modules/workshop/domain/workshop-blueprint-instances.test.ts`

- [ ] **Step 1: Write the failing domain tests**

Create `src/modules/workshop/domain/workshop-blueprint-instances.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  canCraftBlueprintInstance,
  createLegacyBlueprintInstances,
  formatWorkshopBlueprintQuality,
  isSecretSkinningKitConditionMet,
} from './workshop-blueprint-instances';

describe('workshop blueprint instances', () => {
  it('converts a legacy stack into stable available common instances', () => {
    const instances = createLegacyBlueprintInstances({
      playerId: 7,
      blueprintCode: 'skinning_kit',
      quantity: 2,
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:10:00.000Z',
    });

    expect(instances).toEqual([
      expect.objectContaining({
        id: 'legacy:7:skinning_kit:1',
        playerId: 7,
        blueprintCode: 'skinning_kit',
        rarity: 'COMMON',
        discoveryKind: 'LEGACY',
        quality: 'STURDY',
        status: 'AVAILABLE',
      }),
      expect.objectContaining({
        id: 'legacy:7:skinning_kit:2',
        playerId: 7,
        blueprintCode: 'skinning_kit',
        rarity: 'COMMON',
        discoveryKind: 'LEGACY',
        quality: 'STURDY',
        status: 'AVAILABLE',
      }),
    ]);
  });

  it('does not allow consumed or expired blueprint instances to be crafted', () => {
    const [available] = createLegacyBlueprintInstances({
      playerId: 7,
      blueprintCode: 'skinning_kit',
      quantity: 1,
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:10:00.000Z',
    });

    expect(canCraftBlueprintInstance(available)).toBe(true);
    expect(canCraftBlueprintInstance({ ...available, status: 'CONSUMED' })).toBe(false);
    expect(canCraftBlueprintInstance({ ...available, status: 'EXPIRED' })).toBe(false);
  });

  it('formats player-facing quality labels in Russian', () => {
    expect(formatWorkshopBlueprintQuality('ROUGH')).toBe('Грубое');
    expect(formatWorkshopBlueprintQuality('STURDY')).toBe('Крепкое');
    expect(formatWorkshopBlueprintQuality('FINE')).toBe('Тонкое');
    expect(formatWorkshopBlueprintQuality('MASTERWORK')).toBe('Мастерское');
  });

  it('discovers the secret skinning kit from beast trophy progress without spending radiance', () => {
    expect(isSecretSkinningKitConditionMet({
      enemyKind: 'beast',
      successfulTrophyActions: 3,
      bestiaryVictoryCount: 5,
    })).toBe(true);

    expect(isSecretSkinningKitConditionMet({
      enemyKind: 'spirit',
      successfulTrophyActions: 3,
      bestiaryVictoryCount: 5,
    })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the domain test to verify it fails**

Run:

```bash
npx vitest run src/modules/workshop/domain/workshop-blueprint-instances.test.ts
```

Expected: FAIL because `workshop-blueprint-instances.ts` does not exist.

- [ ] **Step 3: Implement the domain module**

Create `src/modules/workshop/domain/workshop-blueprint-instances.ts`:

```ts
import type { WorkshopBlueprintCode, WorkshopBlueprintRarity } from './workshop-catalog';

export type WorkshopBlueprintDiscoveryKind =
  | 'COMMON'
  | 'SECRET'
  | 'QUEST'
  | 'SCHOOL'
  | 'REPAIR'
  | 'LEGACY';

export type WorkshopBlueprintInstanceStatus = 'AVAILABLE' | 'CONSUMED' | 'EXPIRED';
export type WorkshopBlueprintQuality = 'ROUGH' | 'STURDY' | 'FINE' | 'MASTERWORK';
export type WorkshopBlueprintSourceType =
  | 'TROPHY'
  | 'QUEST'
  | 'BESTIARY'
  | 'DAILY_TRACE'
  | 'EVENT'
  | 'SCHOOL_TRIAL'
  | 'LEGACY';

export interface WorkshopBlueprintModifierSnapshot {
  readonly radianceFeatureAwakened?: boolean;
  readonly notes?: readonly string[];
}

export interface WorkshopBlueprintInstanceView {
  readonly id: string;
  readonly playerId: number;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly rarity: WorkshopBlueprintRarity;
  readonly sourceType: WorkshopBlueprintSourceType;
  readonly sourceId: string | null;
  readonly discoveryKind: WorkshopBlueprintDiscoveryKind;
  readonly quality: WorkshopBlueprintQuality;
  readonly craftPotential: string;
  readonly modifierSnapshot: WorkshopBlueprintModifierSnapshot;
  readonly status: WorkshopBlueprintInstanceStatus;
  readonly createdAt: string;
  readonly discoveredAt: string | null;
  readonly consumedAt: string | null;
}

export interface LegacyBlueprintStackInput {
  readonly playerId: number;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly quantity: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SecretSkinningKitConditionInput {
  readonly enemyKind: string;
  readonly successfulTrophyActions: number;
  readonly bestiaryVictoryCount: number;
}

const qualityLabels: Readonly<Record<WorkshopBlueprintQuality, string>> = {
  ROUGH: 'Грубое',
  STURDY: 'Крепкое',
  FINE: 'Тонкое',
  MASTERWORK: 'Мастерское',
};

const normalizeQuantity = (quantity: number): number => (
  Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0
);

export const formatWorkshopBlueprintQuality = (quality: WorkshopBlueprintQuality): string => (
  qualityLabels[quality]
);

export const canCraftBlueprintInstance = (
  instance: Pick<WorkshopBlueprintInstanceView, 'status'>,
): boolean => instance.status === 'AVAILABLE';

export const createLegacyBlueprintInstances = (
  stack: LegacyBlueprintStackInput,
): readonly WorkshopBlueprintInstanceView[] => {
  const quantity = normalizeQuantity(stack.quantity);

  return Array.from({ length: quantity }, (_, index): WorkshopBlueprintInstanceView => ({
    id: `legacy:${stack.playerId}:${stack.blueprintCode}:${index + 1}`,
    playerId: stack.playerId,
    blueprintCode: stack.blueprintCode,
    rarity: 'COMMON',
    sourceType: 'LEGACY',
    sourceId: null,
    discoveryKind: 'LEGACY',
    quality: 'STURDY',
    craftPotential: 'legacy_default',
    modifierSnapshot: {},
    status: 'AVAILABLE',
    createdAt: stack.createdAt,
    discoveredAt: stack.updatedAt,
    consumedAt: null,
  }));
};

export const isSecretSkinningKitConditionMet = (
  input: SecretSkinningKitConditionInput,
): boolean => (
  input.enemyKind === 'beast'
  && input.successfulTrophyActions >= 3
  && input.bestiaryVictoryCount >= 5
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run src/modules/workshop/domain/workshop-blueprint-instances.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/workshop/domain/workshop-blueprint-instances.ts src/modules/workshop/domain/workshop-blueprint-instances.test.ts
git commit -m "feat: model workshop blueprint instances"
```

---

### Task 2: Add Workshop Crafting Skill

**Files:**
- Modify: `src/shared/types/player.ts`
- Modify: `src/modules/player/domain/player-skills.ts`
- Modify: `src/modules/player/domain/player-skills.test.ts`

- [ ] **Step 1: Write the failing skill test**

Add this test to `src/modules/player/domain/player-skills.test.ts`:

```ts
it('includes workshop craft as a crafting skill for equipment quality', () => {
  expect(getPlayerSkillDefinition('crafting.workshop')).toEqual({
    code: 'crafting.workshop',
    category: 'crafting',
    title: 'Мастерство',
    description: 'Работа с чертежами, снаряжением, качеством предметов и ремонтом.',
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npx vitest run src/modules/player/domain/player-skills.test.ts
```

Expected: FAIL because `crafting.workshop` is not a valid `PlayerSkillCode`.

- [ ] **Step 3: Add the skill code and definition**

Change `src/shared/types/player.ts`:

```ts
export type CraftingSkillCode =
  | 'crafting.alchemy'
  | 'crafting.workshop';
```

Add to `playerSkillDefinitions` in `src/modules/player/domain/player-skills.ts`:

```ts
{
  code: 'crafting.workshop',
  category: 'crafting',
  title: 'Мастерство',
  description: 'Работа с чертежами, снаряжением, качеством предметов и ремонтом.',
},
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
npx vitest run src/modules/player/domain/player-skills.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/player.ts src/modules/player/domain/player-skills.ts src/modules/player/domain/player-skills.test.ts
git commit -m "feat: add workshop crafting skill"
```

---

### Task 3: Persist Blueprint Instances

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260428190000_add_blueprint_instances/migration.sql`
- Modify: `src/modules/workshop/application/workshop-persistence.ts`
- Modify: `src/modules/shared/infrastructure/prisma/prisma-workshop-persistence.ts`
- Modify: `src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`

- [ ] **Step 1: Write failing persistence mapper tests**

Add a test in `src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts` near the existing workshop tests:

```ts
it('lists player blueprint instances with quality and discovery metadata', async () => {
  tx.playerBlueprintInstance.findMany.mockResolvedValue([
    {
      id: 'bp-1',
      playerId: 1,
      blueprintCode: 'skinning_kit',
      rarity: 'COMMON',
      sourceType: 'BESTIARY',
      sourceId: 'wolf:5',
      discoveryKind: 'SECRET',
      quality: 'FINE',
      craftPotential: 'skinning_tool_v1',
      modifierSnapshot: '{}',
      status: 'AVAILABLE',
      createdAt: new Date('2026-04-28T00:00:00.000Z'),
      discoveredAt: new Date('2026-04-28T00:00:00.000Z'),
      consumedAt: null,
    },
  ]);

  await expect(repository.listPlayerBlueprintInstances(1)).resolves.toEqual([
    {
      id: 'bp-1',
      playerId: 1,
      blueprintCode: 'skinning_kit',
      rarity: 'COMMON',
      sourceType: 'BESTIARY',
      sourceId: 'wolf:5',
      discoveryKind: 'SECRET',
      quality: 'FINE',
      craftPotential: 'skinning_tool_v1',
      modifierSnapshot: {},
      status: 'AVAILABLE',
      createdAt: '2026-04-28T00:00:00.000Z',
      discoveredAt: '2026-04-28T00:00:00.000Z',
      consumedAt: null,
    },
  ]);
});
```

- [ ] **Step 2: Run the focused Prisma repository test to verify it fails**

Run:

```bash
npx vitest run src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts
```

Expected: FAIL because `playerBlueprintInstance` and `listPlayerBlueprintInstances` do not exist.

- [ ] **Step 3: Update Prisma schema**

Add relation to `Player` in `prisma/schema.prisma`:

```prisma
  blueprintInstances PlayerBlueprintInstance[]
```

Add the model:

```prisma
model PlayerBlueprintInstance {
  id               String   @id @default(cuid())
  playerId         Int
  blueprintCode    String
  rarity           String
  sourceType       String
  sourceId         String?
  discoveryKind    String
  quality          String
  craftPotential   String   @default("default")
  modifierSnapshot String   @default("{}")
  status           String   @default("AVAILABLE")
  createdAt        DateTime @default(now())
  discoveredAt     DateTime?
  consumedAt       DateTime?
  player           Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@index([playerId, status])
  @@index([playerId, blueprintCode])
  @@index([sourceType, sourceId])
}
```

- [ ] **Step 4: Add SQL migration**

Create `prisma/migrations/20260428190000_add_blueprint_instances/migration.sql`:

```sql
CREATE TABLE "PlayerBlueprintInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" INTEGER NOT NULL,
    "blueprintCode" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "discoveryKind" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "craftPotential" TEXT NOT NULL DEFAULT 'default',
    "modifierSnapshot" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveredAt" DATETIME,
    "consumedAt" DATETIME,

    CONSTRAINT "PlayerBlueprintInstance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerBlueprintInstance_code_known" CHECK ("blueprintCode" IN ('hunter_cleaver', 'tracker_jacket', 'skinning_kit', 'resonance_tool')),
    CONSTRAINT "PlayerBlueprintInstance_rarity_known" CHECK ("rarity" IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC')),
    CONSTRAINT "PlayerBlueprintInstance_source_known" CHECK ("sourceType" IN ('TROPHY', 'QUEST', 'BESTIARY', 'DAILY_TRACE', 'EVENT', 'SCHOOL_TRIAL', 'LEGACY')),
    CONSTRAINT "PlayerBlueprintInstance_discovery_known" CHECK ("discoveryKind" IN ('COMMON', 'SECRET', 'QUEST', 'SCHOOL', 'REPAIR', 'LEGACY')),
    CONSTRAINT "PlayerBlueprintInstance_quality_known" CHECK ("quality" IN ('ROUGH', 'STURDY', 'FINE', 'MASTERWORK')),
    CONSTRAINT "PlayerBlueprintInstance_status_known" CHECK ("status" IN ('AVAILABLE', 'CONSUMED', 'EXPIRED'))
);

CREATE INDEX "PlayerBlueprintInstance_playerId_status_idx" ON "PlayerBlueprintInstance"("playerId", "status");
CREATE INDEX "PlayerBlueprintInstance_playerId_blueprintCode_idx" ON "PlayerBlueprintInstance"("playerId", "blueprintCode");
CREATE INDEX "PlayerBlueprintInstance_sourceType_sourceId_idx" ON "PlayerBlueprintInstance"("sourceType", "sourceId");

WITH RECURSIVE expanded_blueprints AS (
    SELECT
        "playerId",
        "blueprintCode",
        "quantity",
        "createdAt",
        "updatedAt",
        1 AS copyIndex
    FROM "PlayerBlueprint"
    WHERE "quantity" > 0

    UNION ALL

    SELECT
        "playerId",
        "blueprintCode",
        "quantity",
        "createdAt",
        "updatedAt",
        copyIndex + 1
    FROM expanded_blueprints
    WHERE copyIndex < quantity
)
INSERT INTO "PlayerBlueprintInstance" (
    "id",
    "playerId",
    "blueprintCode",
    "rarity",
    "sourceType",
    "sourceId",
    "discoveryKind",
    "quality",
    "craftPotential",
    "modifierSnapshot",
    "status",
    "createdAt",
    "discoveredAt",
    "consumedAt"
)
SELECT
    'legacy:' || "playerId" || ':' || "blueprintCode" || ':' || copyIndex,
    "playerId",
    "blueprintCode",
    'COMMON',
    'LEGACY',
    NULL,
    'LEGACY',
    'STURDY',
    'legacy_default',
    '{}',
    'AVAILABLE',
    "createdAt",
    "updatedAt",
    NULL
FROM expanded_blueprints;
```

- [ ] **Step 5: Add application view type**

Add to `src/modules/workshop/application/workshop-persistence.ts`:

```ts
import type {
  WorkshopBlueprintDiscoveryKind,
  WorkshopBlueprintInstanceStatus,
  WorkshopBlueprintModifierSnapshot,
  WorkshopBlueprintQuality,
  WorkshopBlueprintSourceType,
} from '../domain/workshop-blueprint-instances';
```

Then add:

```ts
export interface PlayerBlueprintInstanceView {
  readonly id: string;
  readonly playerId: number;
  readonly blueprintCode: WorkshopBlueprintCode;
  readonly rarity: WorkshopBlueprintRarity;
  readonly sourceType: WorkshopBlueprintSourceType;
  readonly sourceId: string | null;
  readonly discoveryKind: WorkshopBlueprintDiscoveryKind;
  readonly quality: WorkshopBlueprintQuality;
  readonly craftPotential: string;
  readonly modifierSnapshot: WorkshopBlueprintModifierSnapshot;
  readonly status: WorkshopBlueprintInstanceStatus;
  readonly createdAt: string;
  readonly discoveredAt: string | null;
  readonly consumedAt: string | null;
}
```

- [ ] **Step 6: Map Prisma records**

In `prisma-workshop-persistence.ts`, import `parseJson` and add a mapper:

```ts
const mapPlayerBlueprintInstanceRecord = (record: PlayerBlueprintInstance): PlayerBlueprintInstanceView => ({
  id: record.id,
  playerId: record.playerId,
  blueprintCode: requireKnownWorkshopValue(record.blueprintCode, isWorkshopBlueprintCode, 'blueprintCode'),
  rarity: requireKnownWorkshopValue(record.rarity, isWorkshopBlueprintRarity, 'rarity'),
  sourceType: requireKnownBlueprintSourceType(record.sourceType),
  sourceId: record.sourceId,
  discoveryKind: requireKnownBlueprintDiscoveryKind(record.discoveryKind),
  quality: requireKnownBlueprintQuality(record.quality),
  craftPotential: record.craftPotential,
  modifierSnapshot: parseJson(record.modifierSnapshot, {}),
  status: requireKnownBlueprintInstanceStatus(record.status),
  createdAt: record.createdAt.toISOString(),
  discoveredAt: record.discoveredAt?.toISOString() ?? null,
  consumedAt: record.consumedAt?.toISOString() ?? null,
});
```

Add `listPlayerBlueprintInstances(playerId)` that returns available and consumed rows ordered by `createdAt asc, id asc`.

- [ ] **Step 7: Wire repository API**

Add to `GameRepository`:

```ts
listPlayerBlueprintInstances(playerId: number): Promise<readonly PlayerBlueprintInstanceView[]>;
```

Add pass-through method to `PrismaGameRepository`.

- [ ] **Step 8: Run Prisma generate and focused tests**

Run:

```bash
npm run db:generate
npx vitest run src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260428190000_add_blueprint_instances/migration.sql src/modules/workshop/application/workshop-persistence.ts src/modules/shared/application/ports/GameRepository.ts src/modules/shared/infrastructure/prisma/prisma-workshop-persistence.ts src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts
git commit -m "feat: persist workshop blueprint instances"
```

---

### Task 4: Build Workshop View From Owned Instances Only

**Files:**
- Modify: `src/modules/workshop/application/workshop-view.ts`
- Modify: `src/modules/workshop/application/use-cases/GetWorkshop.ts`
- Modify: `src/modules/workshop/application/use-cases/GetWorkshop.test.ts`

- [ ] **Step 1: Write failing view tests**

In `GetWorkshop.test.ts`, add:

```ts
it('does not show craft templates when the player has no blueprint instances', async () => {
  const repository = createRepository({ blueprints: [], blueprintInstances: [], craftedItems: [] });
  const useCase = new GetWorkshop(repository.asGameRepository());

  const view = await useCase.execute(123);

  expect(view.blueprints).toEqual([]);
});

it('shows only owned available blueprint instances', async () => {
  const repository = createRepository({
    blueprintInstances: [
      createBlueprintInstance({ id: 'bp-1', blueprintCode: 'skinning_kit', status: 'AVAILABLE' }),
      createBlueprintInstance({ id: 'bp-2', blueprintCode: 'hunter_cleaver', status: 'CONSUMED' }),
    ],
  });
  const useCase = new GetWorkshop(repository.asGameRepository());

  const view = await useCase.execute(123);

  expect(view.blueprints.map((entry) => entry.instance.id)).toEqual(['bp-1']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/modules/workshop/application/use-cases/GetWorkshop.test.ts
```

Expected: FAIL because `GetWorkshop` does not load blueprint instances and `WorkshopBlueprintEntryView` has no `instance`.

- [ ] **Step 3: Update view types and builder**

Change `WorkshopBlueprintEntryView` to:

```ts
export interface WorkshopBlueprintEntryView {
  readonly instance: PlayerBlueprintInstanceView;
  readonly blueprint: WorkshopBlueprintDefinition;
  readonly canCraft: boolean;
  readonly missingCost: WorkshopBlueprintCost;
}
```

Change `buildWorkshopView` signature:

```ts
export const buildWorkshopView = (
  player: PlayerState,
  blueprintInstances: readonly PlayerBlueprintInstanceView[],
  craftedItems: readonly PlayerCraftedItemView[],
): WorkshopView => {
  const catalogBlueprintsByCode = new Map(listWorkshopBlueprints().map((blueprint) => [blueprint.code, blueprint]));
  const availableInstances = blueprintInstances.filter((instance) => instance.status === 'AVAILABLE');
  const repairTools = availableInstances
    .map((instance) => ({ instance, blueprint: catalogBlueprintsByCode.get(instance.blueprintCode) }))
    .filter((entry): entry is { instance: PlayerBlueprintInstanceView; blueprint: WorkshopRepairToolBlueprintDefinition } => (
      entry.blueprint?.kind === 'repair_tool'
    ))
    .map(({ instance, blueprint }) => buildRepairToolEntry(player, instance, blueprint));

  return {
    player,
    blueprints: availableInstances
      .map((instance) => ({ instance, blueprint: catalogBlueprintsByCode.get(instance.blueprintCode) }))
      .filter((entry): entry is { instance: PlayerBlueprintInstanceView; blueprint: WorkshopBlueprintDefinition } => (
        entry.blueprint !== undefined
      ))
      .map(({ instance, blueprint }) => buildBlueprintEntry(player, instance, blueprint)),
    repairTools,
    craftedItems: craftedItems.map((item) => buildCraftedItemEntry(item, repairTools)),
  };
};
```

- [ ] **Step 4: Update `GetWorkshop`**

Load `listPlayerBlueprintInstances` instead of `listPlayerBlueprints`:

```ts
const [blueprintInstances, craftedItems] = await Promise.all([
  this.repository.listPlayerBlueprintInstances(player.playerId),
  this.repository.listPlayerCraftedItems(player.playerId),
]);

return buildWorkshopView(player, blueprintInstances, craftedItems);
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npx vitest run src/modules/workshop/application/use-cases/GetWorkshop.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/workshop/application/workshop-view.ts src/modules/workshop/application/use-cases/GetWorkshop.ts src/modules/workshop/application/use-cases/GetWorkshop.test.ts
git commit -m "feat: show owned workshop blueprints only"
```

---

### Task 5: Craft By Blueprint Instance

**Files:**
- Modify: `src/modules/workshop/application/command-intent-state.ts`
- Modify: `src/modules/workshop/application/use-cases/CraftWorkshopItem.ts`
- Modify: `src/modules/workshop/application/use-cases/CraftWorkshopItem.test.ts`
- Modify: `src/modules/shared/application/ports/GameRepository.ts`
- Modify: `src/modules/shared/infrastructure/prisma/prisma-workshop-persistence.ts`
- Modify: `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`

- [ ] **Step 1: Write failing use-case tests**

In `CraftWorkshopItem.test.ts`, add:

```ts
it('crafts from a concrete blueprint instance and consumes only that instance', async () => {
  const blueprintInstance = createBlueprintInstance({
    id: 'bp-1',
    blueprintCode: 'skinning_kit',
    status: 'AVAILABLE',
  });
  const repository = new CraftWorkshopItemRepositoryFixture({
    player: createPlayer({ inventory: { leather: 2, bone: 2 } }),
    blueprintInstances: [blueprintInstance],
  });
  const stateKey = buildCraftWorkshopItemIntentStateKey(
    repository.player,
    blueprintInstance.id,
    [blueprintInstance],
    [],
  );
  const useCase = new CraftWorkshopItem(repository.asGameRepository());

  const result = await useCase.execute(123, 'bp-1', 'intent-1', stateKey);

  expect(result.craftedItem.itemCode).toBe('skinning_kit');
  expect(repository.consumedBlueprintInstanceIds).toEqual(['bp-1']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/modules/workshop/application/use-cases/CraftWorkshopItem.test.ts
```

Expected: FAIL because `CraftWorkshopItem.execute` still accepts `WorkshopBlueprintCode`.

- [ ] **Step 3: Update command state to use instance id**

Change the craft state key signature:

```ts
export const buildCraftWorkshopItemIntentStateKey = (
  player: Pick<PlayerState, 'playerId' | 'updatedAt' | 'inventory'>,
  blueprintInstanceId: string,
  blueprintInstances: readonly Pick<PlayerBlueprintInstanceView, 'id' | 'blueprintCode' | 'status' | 'updatedAt'>[],
  items: readonly CraftedItemStateView[],
): string => serializeStateKey({
  action: 'craft_workshop_item',
  blueprintInstanceId,
  playerId: player.playerId,
  playerUpdatedAt: player.updatedAt,
  materials: summarizeMaterials(player.inventory),
  blueprintInstances: summarizeBlueprintInstances(blueprintInstances),
  items: summarizeItems(items),
});
```

- [ ] **Step 4: Update use case API**

Change `CraftWorkshopItem.execute`:

```ts
public async execute(
  vkId: number,
  blueprintInstanceId: string,
  intentId?: string,
  stateKey?: string,
  intentSource: CommandIntentSource = 'payload',
): Promise<CraftWorkshopItemResultView>
```

Load blueprint instances, require the matching available instance, resolve its catalog definition through `instance.blueprintCode`, and call repository `craftWorkshopItem(player.playerId, blueprintInstanceId, options)`.

- [ ] **Step 5: Update persistence craft mutation**

Change `craftWorkshopItem(playerId, blueprintInstanceId, options)` to:

1. find `PlayerBlueprintInstance` by `id` and `playerId`;
2. require `status = AVAILABLE`;
3. resolve catalog blueprint through `record.blueprintCode`;
4. spend inventory cost;
5. update the instance to `CONSUMED` with `consumedAt = new Date()`;
6. create `PlayerCraftedItem`.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npx vitest run src/modules/workshop/application/use-cases/CraftWorkshopItem.test.ts src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/workshop/application/command-intent-state.ts src/modules/workshop/application/use-cases/CraftWorkshopItem.ts src/modules/workshop/application/use-cases/CraftWorkshopItem.test.ts src/modules/shared/application/ports/GameRepository.ts src/modules/shared/infrastructure/prisma/prisma-workshop-persistence.ts src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts
git commit -m "feat: craft workshop items by blueprint instance"
```

---

### Task 6: Update VK Workshop Commands And Presentation

**Files:**
- Modify: `src/vk/commands/catalog.ts`
- Modify: `src/vk/keyboards/workshop.ts`
- Modify: `src/vk/presenters/workshopMessages.ts`
- Modify: `src/vk/presenters/workshopLabels.ts`
- Modify: `src/vk/handlers/routes/workshopCommandRoutes.ts`
- Modify: `src/vk/handlers/gameHandler.smoke.test.ts`

- [ ] **Step 1: Write failing command and keyboard tests**

In the existing keyboard/handler tests, add assertions:

```ts
expect(createWorkshopCraftCommand('bp-1')).toBe('мастерская чертеж bp-1');
expect(resolveWorkshopCraftCommand('мастерская чертеж bp-1')).toBe('bp-1');
```

Add a keyboard assertion that no craft button is emitted when `view.blueprints` is empty.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/vk/keyboards/index.test.ts src/vk/handlers/gameHandler.smoke.test.ts
```

Expected: FAIL because craft commands still expect `WorkshopBlueprintCode`.

- [ ] **Step 3: Update command parsing**

Change command type:

```ts
export type WorkshopCraftCommand = `${typeof workshopCraftCommandPrefix}${string}`;
export const createWorkshopCraftCommand = (blueprintInstanceId: string): WorkshopCraftCommand => (
  `${workshopCraftCommandPrefix}${blueprintInstanceId}` as WorkshopCraftCommand
);
export const resolveWorkshopCraftCommand = (command: string): string | null => {
  const trimmedCommand = command.trim();
  if (!trimmedCommand.startsWith(workshopCraftCommandPrefix)) {
    return null;
  }

  const blueprintInstanceId = trimmedCommand.slice(workshopCraftCommandPrefix.length).trim();
  return blueprintInstanceId.length > 0 ? blueprintInstanceId : null;
};
```

- [ ] **Step 4: Update keyboard**

Craft rows use `entry.instance.id`:

```ts
command: createWorkshopCraftCommand(entry.instance.id),
stateKey: buildCraftWorkshopItemIntentStateKey(
  view.player,
  entry.instance.id,
  blueprintStateEntries,
  craftedItemStateEntries,
),
```

- [ ] **Step 5: Update presenter**

Blueprint lines include instance quality and discovery kind:

```ts
return `• ${craftState} · ${title}: ${formatWorkshopBlueprintQuality(entry.instance.quality)} · ${formatWorkshopBlueprintDiscovery(entry.instance.discoveryKind)} · ${resultLine} · ${formatWorkshopCost(blueprint.cost)}.`;
```

- [ ] **Step 6: Update route handler**

Pass `blueprintInstanceId` from `resolveWorkshopCraftCommand` to `craftWorkshopItem.execute`.

- [ ] **Step 7: Run focused tests**

Run:

```bash
npx vitest run src/vk/keyboards/index.test.ts src/vk/handlers/gameHandler.smoke.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/vk/commands/catalog.ts src/vk/keyboards/workshop.ts src/vk/presenters/workshopMessages.ts src/vk/presenters/workshopLabels.ts src/vk/handlers/routes/workshopCommandRoutes.ts src/vk/handlers/gameHandler.smoke.test.ts
git commit -m "feat: route workshop craft by blueprint instance"
```

---

### Task 7: Convert Reward Blueprint Drops Into Instances

**Files:**
- Modify: `src/shared/types/inventory.ts`
- Modify: `src/shared/types/rewards.ts`
- Modify: `src/modules/shared/domain/contracts/resource-reward-contract.ts`
- Modify: `src/modules/shared/domain/contracts/contracts.test.ts`
- Modify: `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`
- Modify: `src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`

- [ ] **Step 1: Write failing reward contract tests**

Add to `contracts.test.ts`:

```ts
expect(isResourceRewardSnapshot({
  blueprintDrops: [{
    blueprintCode: 'skinning_kit',
    rarity: 'COMMON',
    sourceType: 'BESTIARY',
    sourceId: 'wolf:5',
    discoveryKind: 'SECRET',
    qualityHint: 'FINE',
    modifierProfileCode: 'skinning_tool_v1',
  }],
})).toBe(true);
```

- [ ] **Step 2: Run contract tests to verify failure**

Run:

```bash
npx vitest run src/modules/shared/domain/contracts/contracts.test.ts
```

Expected: FAIL because `blueprintDrops` is not part of `ResourceReward`.

- [ ] **Step 3: Add reward types**

In `src/shared/types/inventory.ts`:

```ts
export interface BlueprintDropIntent {
  readonly blueprintCode: string;
  readonly rarity: string;
  readonly sourceType: string;
  readonly sourceId?: string | null;
  readonly discoveryKind: string;
  readonly qualityHint?: string;
  readonly modifierProfileCode?: string;
}
```

In `src/shared/types/rewards.ts`:

```ts
readonly blueprintDrops?: readonly BlueprintDropIntent[];
```

- [ ] **Step 4: Validate reward snapshots**

Update `resource-reward-contract.ts` to accept `blueprintDrops` when every entry has string `blueprintCode`, `rarity`, `sourceType`, and `discoveryKind`.

- [ ] **Step 5: Apply drops in Prisma repository**

In `PrismaGameRepository.applyResourceReward`, apply both:

```ts
if (reward.blueprintDrops) {
  await this.applyBlueprintDrops(client, playerId, reward.blueprintDrops);
}

if (reward.blueprintDelta) {
  await this.applyBlueprintDelta(client, playerId, reward.blueprintDelta);
}
```

`applyBlueprintDelta` should grant `COMMON` / `LEGACY` or `COMMON` / `COMMON` instances so old quest rewards still work.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npx vitest run src/modules/shared/domain/contracts/contracts.test.ts src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shared/types/inventory.ts src/shared/types/rewards.ts src/modules/shared/domain/contracts/resource-reward-contract.ts src/modules/shared/domain/contracts/contracts.test.ts src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts
git commit -m "feat: grant blueprint drops as instances"
```

---

### Task 8: Add First Secret Blueprint Source

**Files:**
- Modify: `src/modules/world/domain/bestiary.ts`
- Modify: `src/modules/world/domain/bestiary.test.ts`
- Modify: `src/modules/world/application/use-cases/GetBestiary.ts`
- Modify: `src/vk/presenters/bestiaryMessages.ts`

- [ ] **Step 1: Write failing bestiary reward test**

Add to `bestiary.test.ts`:

```ts
it('adds the secret skinning kit blueprint to the beast five-kill milestone', () => {
  const reward = resolveBestiaryKillMilestoneReward(5, {
    code: 'forest-wolf',
    kind: 'beast',
  });

  expect(reward.blueprintDrops).toEqual([
    {
      blueprintCode: 'skinning_kit',
      rarity: 'COMMON',
      sourceType: 'BESTIARY',
      sourceId: 'forest-wolf:5',
      discoveryKind: 'SECRET',
      qualityHint: 'FINE',
      modifierProfileCode: 'skinning_tool_v1',
    },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/modules/world/domain/bestiary.test.ts
```

Expected: FAIL because `resolveBestiaryKillMilestoneReward` does not accept an enemy context.

- [ ] **Step 3: Update reward resolver**

Change signature:

```ts
export interface BestiaryRewardEnemyContext {
  readonly code: string;
  readonly kind: string;
}

export const resolveBestiaryKillMilestoneReward = (
  threshold: number,
  enemy?: BestiaryRewardEnemyContext,
): ResourceReward => {
  const baseReward: ResourceReward = {
    radiance: killMilestoneRadianceByThreshold[threshold] ?? 1,
  };

  if (threshold === 5 && enemy?.kind === 'beast') {
    return {
      ...baseReward,
      blueprintDrops: [{
        blueprintCode: 'skinning_kit',
        rarity: 'COMMON',
        sourceType: 'BESTIARY',
        sourceId: `${enemy.code}:${threshold}`,
        discoveryKind: 'SECRET',
        qualityHint: 'FINE',
        modifierProfileCode: 'skinning_tool_v1',
      }],
    };
  }

  return baseReward;
};
```

- [ ] **Step 4: Pass enemy context from GetBestiary**

In `GetBestiary.claimQualifiedKillMilestoneRewards`, call:

```ts
resolveBestiaryKillMilestoneReward(threshold, {
  code: template.code,
  kind: template.kind,
})
```

- [ ] **Step 5: Update presentation copy**

In bestiary messages, when reward has `blueprintDrops`, include:

```text
📜 Секретный чертёж найден.
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npx vitest run src/modules/world/domain/bestiary.test.ts src/modules/world/application/use-cases/GetBestiary.test.ts src/vk/presenters/bestiaryMessages.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/world/domain/bestiary.ts src/modules/world/domain/bestiary.test.ts src/modules/world/application/use-cases/GetBestiary.ts src/vk/presenters/bestiaryMessages.ts src/vk/presenters/bestiaryMessages.test.ts
git commit -m "feat: discover secret skinning blueprint"
```

---

### Task 9: Full Verification

**Files:**
- No direct source edits unless verification exposes a defect.

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run content validation**

```bash
npm run content:validate
```

Expected: PASS.

- [ ] **Step 3: Run test suite**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Run local release playtest**

```bash
npm run release:local-playtest
```

Expected: PASS.

- [ ] **Step 6: Commit any verification fixes**

If fixes were required:

```bash
git add src/modules/workshop src/modules/shared src/shared src/vk prisma
git commit -m "fix: stabilize blueprint instance flow"
```

If no fixes were required, do not create an empty commit.

## Self-Review

- Spec coverage: this plan covers unique blueprint instances, secret blueprint discovery, workshop hiding static templates, concrete craft consumption, legacy compatibility, and Сияние not being a secret-unlock currency.
- Known remaining Economy Loop v1 work: NPC purchases, full quality math from `crafting.workshop`, radiance feature awakening UI, and expanded source/sink evidence.
- Placeholder scan: no `TODO`, `TBD`, or unspecified file steps.
- Type consistency: the plan uses `blueprintInstanceId`, `PlayerBlueprintInstanceView`, `discoveryKind`, `quality`, and `crafting.workshop` consistently.
