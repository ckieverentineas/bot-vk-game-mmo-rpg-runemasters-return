# Player State Versioning Policy v1

## Status

- Status: `document-first platform policy v1`
- Scope: persisted player state hydration, compatibility boundaries, fixtures, and future versioning decisions.
- Source references: `docs/platform/persistence-versioning-rules.md`, `docs/reviews/phase-1-exit-gate.md`.

## Goal

Player-facing runtime state must be safe to hydrate across small schema changes without scattering fallback rules through use-cases, presenters, or transport handlers.

This policy closes the document-first player-state versioning gap for Phase 1. It does not add a Prisma migration and does not introduce a new persisted `PlayerState` JSON envelope.

## Current boundary

`PlayerState` is a runtime aggregate, not one persisted row.

Current source-of-truth tables:

- `Player`: identity, level, experience, gold, base stats, timestamps;
- `PlayerProgress`: location, current rune cursor, unlocked rune slots, active battle pointer, tutorial state, battle counters;
- `PlayerInventory`: shards and materials;
- `Rune`: owned rune records, rarity, school/archetype keys, ability-code payloads, equip slot;
- `PlayerSchoolMastery`: school experience and rank;
- `PlayerSkill`: action-based skill experience and rank.

Adjacent persistence contracts are not part of `PlayerState`, even when they affect the next screen:

- `BattleSession` owns battle snapshots and active encounter state;
- `RewardLedgerRecord` owns exact-once reward claim facts;
- `CommandIntentRecord` owns replay/stale command receipts;
- telemetry records own evidence, not gameplay state.

## Versioning model

### 1. Table-backed player state

Table-backed player state is versioned by:

- Prisma schema changes;
- explicit hydration rules in `src/modules/shared/infrastructure/prisma/player-state-hydration.ts`;
- checked-in compatibility fixtures;
- repository tests that prove current, legacy, and future-tolerant payloads can still hydrate.

Do not add a `PlayerState.schemaVersion` field while the state remains a normalized table aggregate. A single version number would imply a single serialized contract that does not exist yet.

### 2. Versioned snapshots

Use explicit `schemaVersion` only for serialized payloads with their own lifecycle:

- `LoadoutSnapshot`;
- `RewardIntent`;
- `RewardLedger`;
- `QuestRewardLedger`;
- `PendingRewardSnapshot`;
- `BattleSnapshot`.

If a future player-owned feature needs a persisted JSON blob, that blob must follow the same versioned-contract style instead of hiding inside ad-hoc player fields.

### 3. Derived read models

Derived read models must not become hidden source-of-truth state.

Examples:

- next-goal guidance;
- quest progress that can be read from current player counters, runes, skills, inventory, school mastery, or reward ledger;
- school recognition/presentation;
- acquisition summary copy;
- battle clarity based on the active battle snapshot.

If a feature cannot be rebuilt from source-of-truth tables and existing ledgers, it needs a new explicit persistence decision before implementation.

## Hydration owner

`hydratePlayerStateFromPersistence()` is the only compatibility boundary for building `PlayerState` from Prisma records.

Rules:

- `prisma-game-mappers.ts` may shape Prisma records into hydration input;
- use-cases must consume `PlayerState`, not raw Prisma records;
- presenters must consume application/domain read models, not persistence rows;
- fallback behavior belongs in the hydration helper or a dedicated versioned contract, not in VK handlers.

## Current hydration guarantees

The current helper must safely handle:

- missing `PlayerProgress` fields;
- missing `PlayerInventory`;
- legacy equipped-rune rows that use `isEquipped` without `equippedSlot`;
- out-of-range `currentRuneIndex`;
- `highestLocationLevel` lower than `locationLevel`;
- missing starter school mastery rows;
- missing or invalid skill rows;
- future/unknown fields that should be ignored;
- unknown `tutorialState`;
- invalid `activeBattleId`;
- `unlockedRuneSlotCount` values that would silently downgrade the current two-slot baseline.

The fallback intent is conservative:

- clamp counters and cursors to valid non-negative ranges;
- preserve current state when it is valid;
- derive safe defaults only when state is missing or malformed;
- never grant rewards or reroll gameplay state during hydration;
- never use hydration as a stealth migration path for new gameplay systems.

## Existing fixtures

Fixtures live in `src/modules/shared/infrastructure/prisma/fixtures/`.

| Fixture | Purpose | Current coverage |
|---|---|---|
| `player-state-current.json` | Current table aggregate shape for player/progress/inventory/runes/school mastery. | Baseline payload for future compatibility tests. |
| `player-state-legacy.json` | Legacy-safe payload with missing inventory, missing unlocked slot count, legacy equip semantics, empty school masteries, and out-of-range rune cursor. | Covered by repository hydration test. |
| `player-state-future.json` | Future-tolerant payload with unknown fields, unknown tutorial state, invalid active battle id, partial inventory, and unsafe slot/cursor values. | Covered by repository hydration test. |

Related non-player fixtures in the same directory cover battle snapshot compatibility:

- `battle-player-legacy.json`;
- `battle-enemy-legacy.json`;
- `battle-snapshot-v1.json`;
- `battle-snapshot-future.json`.

## Change policy

Any future change that affects persisted player state must choose one of these routes before code lands:

1. **Pure read-model change**
   - No storage change.
   - No Prisma migration.
   - Tests prove the read model can be rebuilt from existing `PlayerState` or existing ledgers.

2. **Additive table-backed field/relation**
   - Prisma migration required.
   - Hydration helper updated.
   - Current/legacy/future fixtures updated or extended.
   - Repository hydration tests updated.
   - Release docs updated if rollback or player-facing behavior changes.

3. **New serialized player-owned payload**
   - Dedicated `schemaVersion` contract required.
   - Contract tests required.
   - Repository fallback/rejection behavior required.
   - Compatibility fixtures required.
   - Product/platform review required before adding the blob.

4. **Non-derivable gameplay state**
   - Must not be stored as an incidental field inside `PlayerState`.
   - Needs a named owner table or versioned contract.
   - Must document replay, rollback, and reward-safety behavior.

## What stays open

This policy does not close every platform gap.

Still open:

- no persisted `PlayerState` schema envelope exists, by design;
- no Prisma migration or backfill is included in Q-036;
- no broad migration harness exists beyond checked-in fixtures and repository tests;
- `player-state-current.json` exists as a baseline fixture, but the next storage-affecting player-state slice should add an explicit current-fixture assertion beside the legacy/future assertions;
- full source-of-truth vs derived read-model audit remains a separate sign-off item;
- legacy battle fallback column retirement remains a separate policy decision.

## Release rule

For Q-036, docs-only verification is sufficient because the change defines policy and does not alter runtime storage.

For future player-state persistence changes, docs-only verification is not enough. The slice must include at least:

- `npm run typecheck`;
- targeted repository/contract tests;
- fixture updates;
- `npm run content:validate` if content-derived read models changed;
- release/preflight checks before shipping.
