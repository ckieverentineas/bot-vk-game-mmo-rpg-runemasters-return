# Battle Fallback Retirement Policy v1

## Status

- Status: `document-first platform policy v1`
- Scope: legacy battle JSON columns, rollback safety, migration window criteria, and retirement decision.
- Runtime impact: no schema change, no Prisma migration, no repository behavior change.
- Source references: `docs/platform/persistence-versioning-rules.md`, `docs/platform/state-read-model-boundaries.md`, `ARCHITECTURE.md`, `docs/reviews/phase-1-exit-gate.md`.

## Decision

Legacy battle columns are a migration bridge, not a permanent target contract.

The current release must keep writing and reading both forms:

- preferred source: `BattleSession.battleSnapshot`;
- compatibility columns: `playerSnapshot`, `enemySnapshot`, `log`, `result`, `rewardsSnapshot`;
- revision guard: row `actionRevision` must match the embedded `battleSnapshot.actionRevision` before the versioned snapshot is trusted.

Legacy columns may be retired only after an explicit migration window proves that `battleSnapshot` can carry every supported battle recovery path and rollback no longer depends on older binaries reading the legacy shape.

## Why fallback exists now

The fallback protects three concrete risks:

1. **Old rows** - battles created before `battleSnapshot` existed still need to hydrate.
2. **Rollback** - an older deployed binary can ignore the additive `battleSnapshot` column and continue reading the legacy columns.
3. **Revision mismatch** - if a write race leaves `battleSnapshot.actionRevision` behind the row `actionRevision`, the runtime uses legacy columns as the newer canonical fallback instead of dropping mutable combat state.

Because these risks are real, Q-038 does not schedule removal. It only defines when removal becomes safe.

## Current read/write rule

The active repository behavior remains:

- create/save/finalize battle writes `battleSnapshot` and legacy columns together;
- read prefers a valid `battleSnapshot` whose embedded `actionRevision` equals the row `actionRevision`;
- read falls back to legacy columns when `battleSnapshot` is missing, unreadable, unsupported, or revision-stale;
- unsupported future `battleSnapshot` payloads must fail closed into fallback, not partial hydration;
- if both versioned snapshot and legacy fallback are unusable, runtime should reject recovery with a clear battle-state error instead of inventing combat state.

## Permanent fallback criteria

Keep the legacy columns as permanent fallback when any of these remains true:

- production rollback still allows returning to a binary that reads only legacy battle columns;
- active battles can live across multiple release trains without a forced recovery, expiry, or migration step;
- there is no checked migration scan proving active/completed rows have valid `battleSnapshot` payloads;
- support or QA workflows still inspect legacy columns as the only readable battle state;
- `BattleSnapshot` lacks fields required to resume all shipped combat branches;
- repository tests do not cover legacy-only, valid snapshot, invalid snapshot, future snapshot, and revision-mismatch reads.

If any criterion is true, the columns stay. This is not debt forgiveness; it is explicit rollback safety.

## Retirement criteria

Retirement becomes eligible only when all of these are true:

1. **Snapshot completeness**
   - `BattleSnapshot` contains every mutable combat field needed by shipped runtime.
   - Current battle creation, save, finalize, stale-action, reward, encounter-offer, engage, flee, and recovery paths write a valid versioned snapshot.

2. **Migration window**
   - A migration or one-shot backfill plan exists for rows whose `battleSnapshot` is missing or invalid.
   - The plan is dry-run safe and reports counts before writing.
   - The plan has a rollback note that explains whether it restores legacy columns, keeps a database backup, or blocks binary rollback past the migration point.

3. **Evidence**
   - Repository/contract tests cover current, legacy-only, future/unsupported, unreadable, and revision-mismatch payloads.
   - A local validation command or release note records that no supported active battle requires legacy-only hydration after the migration/backfill.
   - Release evidence or logs show no unexpected `battleSnapshot` rejection during the migration window.

4. **Rollback safety**
   - The release train no longer needs to roll back to a binary that depends on legacy battle columns.
   - Database backup and restore instructions are current.
   - Operators know that schema removal makes rollback to pre-snapshot binaries unsafe unless data is restored with the old columns.

5. **Docs sync**
   - `ARCHITECTURE.md`, this policy, release checklist, and persistence docs state the new read path.
   - The phase gate or release note records that legacy battle fallback moved from `compatibility fallback` to `retired`.

## Migration window shape

A safe retirement should happen in separate commits or releases:

1. **Dual-write window**
   - Keep the current behavior.
   - Add or confirm tests that prove snapshot and legacy fallback both hydrate.

2. **Backfill and scan window**
   - Add a non-destructive scan or dry-run migration.
   - Backfill missing/invalid `battleSnapshot` rows only after the scan output is reviewed.
   - Keep legacy columns and dual-read behavior.

3. **Snapshot-primary enforcement window**
   - Runtime may warn or reject new legacy-only active battles after backfill, but still keeps legacy columns for rollback.
   - Confirm no supported active battle depends on fallback.

4. **Schema retirement window**
   - Remove legacy columns only after rollback to pre-snapshot binaries is out of scope.
   - Ship migration, contract tests, release checklist update, and backup/restore note together.

Do not combine all four windows in one gameplay feature commit.

## Not allowed

- Removing legacy columns in a docs-only slice.
- Removing fallback because current fixtures pass without scanning real persisted rows.
- Trusting `battleSnapshot` when embedded `actionRevision` does not match the row.
- Treating telemetry as the source of truth for whether battle recovery is safe.
- Backfilling by rerolling enemies, rewards, turn owner, or combat log.
- Hiding battle-state repair inside player hydration.

## Verification expectations

For Q-038, docs-only verification is sufficient because this policy does not change storage or runtime behavior.

Any future retirement implementation must include:

- Prisma migration if columns are removed or constraints change;
- repository mapper tests for snapshot-primary and fallback paths;
- compatibility fixtures for current, legacy, and future/unsupported battle payloads;
- migration dry-run output or release note;
- rollback/backup instructions in the release checklist or production runbook;
- `npm run check` and the relevant release gate preset before shipping.
