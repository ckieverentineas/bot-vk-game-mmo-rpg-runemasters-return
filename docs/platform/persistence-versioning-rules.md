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

## Player-state hydration rules

Полная versioned schema для `player state` всё ещё не введена, но runtime теперь обязан гидратировать persisted player state через один compatibility-safe helper, а не через разрозненные ad-hoc fallback'и.

- `Player`, `PlayerProgress`, `PlayerInventory`, `Rune` и `PlayerSchoolMastery` остаются source-of-truth таблицами;
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

## Release rule

- additive persistence change must ship with:
  - schema migration if storage changed;
  - repository hydration tests;
  - compatibility fixtures;
  - docs sync in `PLAN.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, and `RELEASE_CHECKLIST.md` if release behavior changed.

## Still open after v1

- schema versioning for full `player state`;
- broader migration harness beyond current checked-in fixtures and hydration tests;
- future decision on whether legacy battle columns remain permanent fallback or are retired after a migration window.
