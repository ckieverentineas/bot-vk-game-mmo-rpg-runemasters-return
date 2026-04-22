# Persistence Versioning Rules v1

## Goal

Versioned persistence contracts must let the runtime distinguish between:

- supported current state;
- legacy state that can still be hydrated;
- newer/unknown state that requires safe fallback or explicit migration.

## Current versioned contracts

- `LoadoutSnapshot` — versioned contract for persisted rune loadout state in battle;
- `RewardIntent` — canonical reward payload before persistence;
- `RewardLedger` — exact-once reward application audit trail;
- `BattleSnapshot` — versioned persisted JSON snapshot for mutable battle state (`player`, `enemy`, `log`, `result`, `rewards`).
- `PlayerState` — normalized table aggregate with document-first versioning policy in `docs/platform/player-state-versioning-policy.md`, not a single versioned JSON envelope.
- State/read-model boundary — document-first platform policy in `docs/platform/state-read-model-boundaries.md`.
- Battle fallback retirement — document-first platform policy in `docs/platform/battle-fallback-retirement-policy.md`.
- Migration harness boundary — document-first platform policy in `docs/platform/migration-harness-boundaries.md`.

## Player-state hydration rules

Полная `PlayerState` JSON-envelope schema не вводится в Q-036. Current policy: persisted player state остаётся normalized table aggregate, а runtime обязан гидратировать его через один compatibility-safe helper, а не через разрозненные ad-hoc fallback'и.

Canonical policy: `docs/platform/player-state-versioning-policy.md`.
Source-of-truth vs read-model policy: `docs/platform/state-read-model-boundaries.md`.

- `Player`, `PlayerProgress`, `PlayerInventory`, `Rune`, `PlayerSchoolMastery` и `PlayerSkill` остаются source-of-truth таблицами;
- runtime должен уметь безопасно гидратировать:
  - current persisted state;
  - legacy state с неполным `progress` / `inventory` / legacy equipped-slot semantics;
  - newer/unknown state с лишними полями или неизвестным `tutorialState`;
- безопасные fallback rules для player hydration сейчас включают:
  - clamp `currentRuneIndex` в границы текущей коллекции;
  - `highestLocationLevel >= locationLevel`;
  - unknown `tutorialState -> ACTIVE`;
  - missing inventory -> `emptyInventory()`;
  - missing starter school masteries -> derived fallback views;
  - `unlockedRuneSlotCount` не должен silent downgrade'иться ниже текущего baseline двух равноправных рунных слотов.

## Battle snapshot rules

- `BattleSession.battleSnapshot` is the preferred source for versioned mutable battle JSON;
- runtime still dual-reads legacy `playerSnapshot`, `enemySnapshot`, `log`, and `rewardsSnapshot` columns for compatibility;
- runtime trusts `battleSnapshot` only when its embedded `actionRevision` matches the row `actionRevision`; otherwise legacy columns win as the newer canonical fallback;
- if `battleSnapshot` is missing, unreadable, or from a newer schema, repository falls back to legacy columns instead of silently dropping battle state;
- rollback safety is preserved because older application versions can ignore the additive `battleSnapshot` column and continue reading legacy columns.

Retirement policy: `docs/platform/battle-fallback-retirement-policy.md`.

Current decision: legacy battle columns are a migration bridge, not a permanent target contract. They stay until a separate migration window proves snapshot completeness, validates existing rows, and closes rollback to pre-snapshot binaries.

## Compatibility fixture rules

Every new persistence contract that crosses a roadmap gate should get checked-in fixtures for:

1. current schema payload;
2. legacy payload still expected in the wild;
3. newer / unsupported payload used to verify fallback or rejection behavior.

Current fixtures live in `src/modules/shared/infrastructure/prisma/fixtures/`.

Текущий fixture baseline включает не только battle contracts, но и player-state hydration payloads:

- `player-state-current.json`;
- `player-state-legacy.json`;
- `player-state-future.json`.

Fixture meanings and open coverage gaps are documented in `docs/platform/player-state-versioning-policy.md`.

## Migration harness boundary

Minimal scan, dry-run, apply, verify, fixture, and acceptance-gate rules are documented in `docs/platform/migration-harness-boundaries.md`.

Current decision: Q-039 does not add package scripts because no storage-affecting migration is being implemented. The next slice that changes existing persisted rows or retires fallback columns must add only the needed harness commands and prove their reports before release.

## Release rule

- additive persistence change must ship with:
  - schema migration if storage changed;
  - repository hydration tests;
  - compatibility fixtures;
  - migration harness commands and reports when existing rows need scan/backfill/retirement;
  - docs sync in `PLAN.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, and `RELEASE_CHECKLIST.md` if release behavior changed.

## Still open after v1

- persisted `PlayerState` JSON-envelope schema is intentionally not introduced while player state remains a normalized table aggregate;
- explicit current-fixture assertion for the next storage-affecting player-state slice.
