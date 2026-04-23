# Workshop Crafting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first vertical `🛠 Мастерская` slice: blueprints, crafted equipment with durability, `L`/`UL` repair rules, and one exact-once blueprint reward source.

**Architecture:** Keep workshop content and rules in a new `src/modules/workshop` domain. Use focused workshop read models instead of stuffing blueprint and item collections into unrelated rune flows. Persistence lives behind `GameRepository`, with command intent replay matching existing rune and crafting mutations.

**Tech Stack:** TypeScript, Vitest, Prisma, VK Bot API keyboard builders.

---

## File Structure

- Create `src/modules/workshop/domain/workshop-catalog.ts`: item classes, slots, blueprint definitions, material costs, repair rules, and formatting-safe labels.
- Create `src/modules/workshop/domain/workshop-catalog.test.ts`: pure catalog tests for craft readiness, `L`/`UL`, repair eligibility, and material deltas.
- Create `src/modules/workshop/application/command-intent-state.ts`: state keys for craft/equip/repair actions.
- Create `src/modules/workshop/application/use-cases/GetWorkshop.ts`: build hub, blueprint, equipment, and repair read models.
- Create `src/modules/workshop/application/use-cases/CraftWorkshopItem.ts`: consume one blueprint and materials, create crafted item, replay command intent.
- Create `src/modules/workshop/application/use-cases/EquipWorkshopItem.ts`: equip or unequip a crafted item by slot.
- Create `src/modules/workshop/application/use-cases/RepairWorkshopItem.ts`: repair only damaged active `UL` items with a matching repair blueprint.
- Modify `src/shared/types/game.ts`: add workshop value types and optional workshop collections only where needed by read models.
- Modify `prisma/schema.prisma` and add a migration for `PlayerBlueprint` and `PlayerCraftedItem`.
- Modify `src/modules/shared/application/ports/GameRepository.ts`: add workshop repository methods and blueprint reward support.
- Modify `src/modules/shared/infrastructure/prisma/prisma-game-mappers.ts`: include workshop records where repository methods return player state.
- Modify `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`: implement blueprint grants, craft/equip/repair mutations, and resource reward blueprint application.
- Modify `src/modules/quests/domain/quest-definitions.ts`: add an exact-once blueprint reward to `craft_after_battle`.
- Modify `src/app/composition-root.ts`: wire new workshop use cases.
- Create `src/vk/presenters/workshopMessages.ts` and export it from `src/vk/presenters/messages.ts`.
- Create `src/vk/keyboards/workshop.ts` and export it from `src/vk/keyboards/index.ts`.
- Modify `src/vk/commands/catalog.ts`: add workshop commands and dynamic command resolvers.
- Create `src/vk/handlers/routes/workshopCommandRoutes.ts` and register it in `src/vk/handlers/gameCommandRoutes.ts`.
- Modify `src/vk/handlers/gameHandler.ts`: add workshop handler methods.
- Modify `src/vk/handlers/responders/runeReplyFlow.ts`, `src/vk/keyboards/runes.ts`, and `src/vk/presenters/runeMessages.ts`: remove non-rune pill actions from the altar.
- Modify `src/vk/handlers/gameCommandRecovery.ts`: stale workshop actions recover to workshop, not altar.

## Tasks

### Task 1: Workshop Domain Catalog

**Files:**
- Create: `src/modules/workshop/domain/workshop-catalog.ts`
- Test: `src/modules/workshop/domain/workshop-catalog.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for:

```ts
expect(getWorkshopBlueprint('hunter_cleaver').resultItemCode).toBe('hunter_cleaver');
expect(canCraftWorkshopBlueprint(playerInventory, getWorkshopBlueprint('hunter_cleaver'))).toBe(true);
expect(resolveWorkshopCraftInventoryDelta(getWorkshopBlueprint('hunter_cleaver'))).toEqual({ leather: -4, bone: -2, metal: -1 });
expect(canRepairWorkshopItem(createItem({ itemClass: 'L' }), getWorkshopBlueprint('resonance_tool'))).toBe(false);
expect(canRepairWorkshopItem(createItem({ itemClass: 'UL', durability: 11, maxDurability: 20 }), getWorkshopBlueprint('resonance_tool'))).toBe(true);
```

- [ ] **Step 2: Run RED**

Run: `npm test -- --run src/modules/workshop/domain/workshop-catalog.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement catalog**

Define:

- `WorkshopItemClass = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'L' | 'UL'`
- `WorkshopItemSlot = 'weapon' | 'armor' | 'trinket' | 'tool'`
- `WorkshopItemStatus = 'ACTIVE' | 'BROKEN' | 'DESTROYED'`
- `WorkshopBlueprintKind = 'craft_item' | 'repair_tool'`
- starter blueprints: `hunter_cleaver`, `tracker_jacket`, `skinning_kit`, `resonance_tool`
- pure helpers for cost, missing cost, craft delta, repair eligibility.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- --run src/modules/workshop/domain/workshop-catalog.test.ts`

Expected: PASS.

### Task 2: Persistence And Repository

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260423123000_add_workshop_crafting/migration.sql`
- Modify: `src/shared/types/game.ts`
- Modify: `src/modules/shared/application/ports/GameRepository.ts`
- Modify: `src/modules/shared/infrastructure/prisma/prisma-game-mappers.ts`
- Modify: `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`
- Test: `src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Cover:

- `grantBlueprints` increments a player blueprint stack.
- `craftWorkshopItem` consumes one blueprint, spends materials, and creates an `ACTIVE` crafted item.
- duplicate `craftWorkshopItem` command intent returns the canonical result.
- `repairWorkshopItem` rejects non-`UL` targets.
- `repairWorkshopItem` restores a damaged `UL` item and consumes one repair blueprint.

- [ ] **Step 2: Run RED**

Run: `npm test -- --run src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`

Expected: FAIL because models and repository methods do not exist.

- [ ] **Step 3: Implement persistence**

Add Prisma models:

```prisma
model PlayerBlueprint {
  playerId      Int
  blueprintCode String
  quantity      Int      @default(0)
  updatedAt     DateTime @updatedAt
  player        Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@id([playerId, blueprintCode])
}

model PlayerCraftedItem {
  id            String   @id @default(cuid())
  playerId      Int
  itemCode      String
  itemClass     String
  slot          String
  durability    Int
  maxDurability Int
  status        String   @default("ACTIVE")
  equipped      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  player        Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@index([playerId, slot, equipped])
  @@index([playerId, status])
}
```

Run `npx prisma generate` after schema changes.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- --run src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`

Expected: PASS.

### Task 3: Workshop Use Cases

**Files:**
- Create: `src/modules/workshop/application/command-intent-state.ts`
- Create: `src/modules/workshop/application/use-cases/GetWorkshop.ts`
- Create: `src/modules/workshop/application/use-cases/CraftWorkshopItem.ts`
- Create: `src/modules/workshop/application/use-cases/EquipWorkshopItem.ts`
- Create: `src/modules/workshop/application/use-cases/RepairWorkshopItem.ts`
- Test: corresponding `*.test.ts` files in the same use-case folder.

- [ ] **Step 1: Write failing use-case tests**

Cover:

- workshop hub summarizes ready blueprints, equipment count, and repairable `UL` count.
- craft rejects missing blueprint before spending materials.
- craft rejects stale payload state.
- equip toggles one item per slot.
- repair rejects `L`, rejects destroyed `UL`, and repairs damaged active `UL`.

- [ ] **Step 2: Run RED**

Run: `npm test -- --run src/modules/workshop/application`

Expected: FAIL because use cases do not exist.

- [ ] **Step 3: Implement use cases**

Follow existing `CraftItem` and rune use-case patterns:

- `GetWorkshop.execute(vkId, screen?)`
- `CraftWorkshopItem.execute(vkId, blueprintCode, intentId?, stateKey?, intentSource?)`
- `EquipWorkshopItem.execute(vkId, itemId, intentId?, stateKey?, intentSource?)`
- `RepairWorkshopItem.execute(vkId, itemId, repairBlueprintCode, intentId?, stateKey?, intentSource?)`

- [ ] **Step 4: Run GREEN**

Run: `npm test -- --run src/modules/workshop/application`

Expected: PASS.

### Task 4: VK Workshop Screens And Altar Cleanup

**Files:**
- Modify: `src/vk/commands/catalog.ts`
- Create: `src/vk/keyboards/workshop.ts`
- Modify: `src/vk/keyboards/index.ts`
- Modify: `src/vk/keyboards/main.ts`
- Modify: `src/vk/keyboards/runes.ts`
- Create: `src/vk/presenters/workshopMessages.ts`
- Modify: `src/vk/presenters/messages.ts`
- Modify: `src/vk/presenters/runeMessages.ts`
- Create: `src/vk/handlers/routes/workshopCommandRoutes.ts`
- Modify: `src/vk/handlers/gameCommandRoutes.ts`
- Modify: `src/vk/handlers/gameHandler.ts`
- Modify: `src/vk/handlers/gameCommandRecovery.ts`
- Test: `src/vk/keyboards/index.test.ts`, `src/vk/presenters/messages.test.ts`, `src/vk/router/commandRouter.test.ts`, `src/vk/handlers/gameHandler.smoke.test.ts`

- [ ] **Step 1: Write failing VK tests**

Cover:

- main menu contains `🛠 Мастерская`;
- altar no longer contains pill buttons or pill text;
- workshop hub has `📜 Чертежи`, `⚒ Снаряжение`, `🧰 Ремонт`;
- blueprint buttons include payload `stateKey`;
- stale workshop craft recovers to workshop screen.

- [ ] **Step 2: Run RED**

Run:

```powershell
npm test -- --run src/vk/keyboards/index.test.ts src/vk/presenters/messages.test.ts src/vk/router/commandRouter.test.ts src/vk/handlers/gameHandler.smoke.test.ts
```

Expected: FAIL on missing commands/screens and altar cleanup.

- [ ] **Step 3: Implement VK layer**

Add commands:

- `workshop`
- `workshopBlueprints`
- `workshopEquipment`
- `workshopRepair`
- dynamic craft/equip/repair commands resolved by prefix or payload command map.

Route static screens and dynamic actions to the new workshop use cases.

- [ ] **Step 4: Run GREEN**

Run the same VK test command.

Expected: PASS.

### Task 5: Reward Blueprint Grants

**Files:**
- Modify: `src/shared/types/game.ts`
- Modify: `src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts`
- Modify: `src/modules/quests/domain/quest-definitions.ts`
- Modify: `src/vk/presenters/message-formatting.ts`
- Test: `src/modules/quests/application/use-cases/ClaimQuestReward.test.ts`, `src/vk/presenters/questMessages.test.ts`

- [ ] **Step 1: Write failing reward tests**

Cover:

- `craft_after_battle` reward includes `blueprints: [{ blueprintCode: 'hunter_cleaver', quantity: 1 }]`;
- claiming the quest grants the blueprint exactly once;
- repeated claim does not duplicate the blueprint.

- [ ] **Step 2: Run RED**

Run:

```powershell
npm test -- --run src/modules/quests/application/use-cases/ClaimQuestReward.test.ts src/vk/presenters/questMessages.test.ts
```

Expected: FAIL until `ResourceReward` and repository reward application understand blueprint drops.

- [ ] **Step 3: Implement reward grants**

Extend `ResourceReward` with:

```ts
readonly blueprints?: readonly {
  readonly blueprintCode: string;
  readonly quantity: number;
}[];
```

Apply blueprint grants inside `applyResourceReward()` using the same transaction as gold/radiance/material rewards.

- [ ] **Step 4: Run GREEN**

Run the same reward test command.

Expected: PASS.

### Task 6: Verification And Branch Finish

**Files:**
- All changed files.

- [ ] **Step 1: Run generated client**

Run: `npx prisma generate`

Expected: exit code 0.

- [ ] **Step 2: Run full verification**

Run: `npm run check`

Expected: typecheck, content validation, build, and tests pass.

- [ ] **Step 3: Review diff**

Run: `git status --short --branch` and `git diff --stat`.

Expected: only workshop feature files, migration, tests, and plan changes.

- [ ] **Step 4: Commit**

Commit in focused chunks:

- `docs: plan workshop crafting implementation`
- `feat: add workshop crafting domain`
- `feat: persist workshop blueprints and items`
- `feat: add workshop vk flow`

## Self-Review

Spec coverage:

- Altar/workshop boundary: Task 4.
- Blueprint ownership and one-time craft: Tasks 1-3.
- Crafted equipment and durability fields: Tasks 1-3.
- `L`/`UL` repair rules: Tasks 1-3.
- Exact-once blueprint reward: Task 5.
- VK screens and quiet UX: Task 4.
- TDD and command intent replay: Tasks 2-5.

Known first-slice constraint:

- Durability loss from live battle/trophy actions may land as a narrow domain/repository helper in Task 3, but broad battle math effects stay out unless tests explicitly cover them. The first player-facing loop can ship with stored durability and repair rules before every item effect is wired into combat.
