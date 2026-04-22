# Migration Harness Boundaries v1

## Status

- Status: `document-first platform policy v1`
- Scope: minimal migration harness beyond checked-in fixtures, including command contracts, fixture expectations, and acceptance gates.
- Runtime impact: no Prisma migration, no package scripts, no database writes.
- Source references: `docs/platform/persistence-versioning-rules.md`, `docs/platform/player-state-versioning-policy.md`, `docs/platform/battle-fallback-retirement-policy.md`, `RELEASE_CHECKLIST.md`.

## Goal

Storage-affecting slices need more than checked-in JSON fixtures once they touch real persisted rows. The harness boundary defines the smallest repeatable workflow that can scan, dry-run, apply, and verify a data migration without hiding gameplay changes inside repository fallback code.

Q-039 defines the boundary only. It does not add the commands yet because there is no active migration in this slice.

## Non-goals

- No Prisma migration in Q-039.
- No new package scripts in Q-039.
- No production database access in Q-039.
- No generic migration platform, dashboard, queue, scheduler, or analytics system.
- No data repair through gameplay rerolls, player hydration side effects, or telemetry-derived guesses.

## When a harness is required

A future slice must add a minimal harness when any of these is true:

- a Prisma migration changes existing columns, constraints, or relations;
- persisted rows need backfill, normalization, expiry, or deletion;
- a versioned snapshot becomes the sole supported read path after a compatibility window;
- rollback safety depends on proving which persisted rows use old vs new shapes;
- fixtures alone cannot prove safety for the live SQLite database.

Docs-only or pure read-model slices do not need the harness.

## Command boundary

Future storage-affecting slices should add the narrowest scripts needed for their contract. Use these names unless there is a strong repo-specific reason to choose a more precise namespace.

| Command | Required for | Behavior |
|---|---|---|
| `npm run migration:scan -- --contract <name>` | Every storage-affecting migration | Read-only scan. Counts current, legacy, unsupported, corrupt, and affected rows. Must not write. |
| `npm run migration:dry-run -- --contract <name>` | Every data migration or backfill | Builds the exact operation plan and writes a local report. Must not write to the database. |
| `npm run migration:apply -- --contract <name> --backup-confirmed` | Only when rows must change | Applies the reviewed plan. Must require an explicit backup confirmation flag. |
| `npm run migration:verify -- --contract <name>` | After apply, or before retiring fallback | Re-reads the database and proves acceptance gates. Must fail on unsupported or unhandled rows. |

If a migration only adds a new nullable column and no existing row needs data movement, `scan` plus normal release checks may be enough. If a migration removes fallback columns or changes reward-bearing state, all four commands are required.

## Command output contract

Each command should print and, when useful, write a markdown or JSON report with:

- contract name and schema/version target;
- database target description without secrets;
- total rows scanned;
- row counts by state: `current`, `legacy`, `future_or_unsupported`, `corrupt`, `needs_backfill`, `would_change`, `changed`, `skipped`;
- invariant failures with row identifiers safe for local logs;
- whether rollback to the previous binary remains safe;
- next required command.

Reports should live under `docs/testing/` only when they are used as release evidence. Local exploratory reports may stay untracked.

## Fixture boundary

Checked-in fixtures remain the first line of defense. A migration harness extends them with row-level migration fixtures when data movement exists.

Required fixture families:

| Fixture family | Purpose | Current examples |
|---|---|---|
| Current payload | Proves the latest supported shape hydrates without migration. | `player-state-current.json`, `battle-snapshot-v1.json` |
| Legacy payload | Proves old rows still hydrate or migrate safely. | `player-state-legacy.json`, `battle-player-legacy.json`, `battle-enemy-legacy.json` |
| Future/unsupported payload | Proves unknown newer data fails closed or falls back safely. | `player-state-future.json`, `battle-snapshot-future.json` |
| Corrupt/unreadable payload | Proves malformed JSON does not silently become gameplay state. | Add when a migration reads user-controlled or old JSON blobs. |
| Pre-migration row | Proves the scan/dry-run recognizes a row that needs work. | Add with the first real data migration. |
| Post-migration row | Proves the apply/verify shape is stable and hydrates. | Add with the first real data migration. |

The current fixture directory is `src/modules/shared/infrastructure/prisma/fixtures/`. A future migration may add a subfolder only when the flat directory becomes hard to scan.

## Acceptance gates

A storage-affecting migration is not releasable until all applicable gates pass:

1. **Design gate**
   - Persistence decision is documented.
   - Source-of-truth vs read-model impact is clear.
   - Rollback behavior is named.

2. **Fixture gate**
   - Current, legacy, and future/unsupported fixtures exist for the affected contract.
   - Corrupt and pre/post migration fixtures exist when data movement or JSON repair is involved.
   - Repository or contract tests prove fixture behavior.

3. **Scan gate**
   - `migration:scan` is read-only.
   - Scan output reports total rows and all state buckets.
   - Unsupported or corrupt rows are explicitly handled by the plan.

4. **Dry-run gate**
   - `migration:dry-run` reports exact intended changes.
   - The report is reviewable before writes.
   - No reward, enemy, battle log, school mastery, or inventory value is rerolled during planning.

5. **Backup and rollback gate**
   - SQLite backup exists before apply.
   - Release or production handoff docs explain whether binary rollback remains safe.
   - If rollback becomes unsafe, the release note says so before apply.

6. **Apply gate**
   - `migration:apply` requires `--backup-confirmed`.
   - Writes are idempotent or safely resumable.
   - Failed apply leaves either unchanged rows or a report that identifies partial state.

7. **Verify gate**
   - `migration:verify` passes after apply.
   - `npm run check` passes.
   - Relevant release gate commands pass.
   - Docs and release notes include the final migration result.

## Current contract map

| Contract | Current status | Harness implication |
|---|---|---|
| `PlayerState` table aggregate | Hydration fixtures and tests exist. No persisted envelope. | No harness command required until a storage-affecting player-state slice lands. |
| `BattleSnapshot` | Versioned snapshot exists with legacy fallback columns. | Retirement requires scan, dry-run, apply, and verify before schema removal. |
| `RewardIntent` / `RewardLedger` | Exact-once payload and ledger contract exist. | Any migration must prove no duplicate rewards and no reroll on replay. |
| `LoadoutSnapshot` | Versioned battle-owned loadout snapshot exists. | Retirement or backfill must prove battle recovery still preserves equipped rune actions and cooldowns. |
| Quest progress | Still derived from `PlayerState` and reward ledger. | No harness until `PlayerQuestState` or another non-derivable quest store exists. |

## Implementation placement

When commands are added, keep them close to existing release tooling:

- CLI entrypoints in `src/tooling/release/` or a future `src/tooling/migrations/` folder;
- pure scan/plan logic in small testable modules;
- Prisma access isolated to the CLI boundary;
- fixture tests beside the affected repository or contract tests.

Do not put migration scan/repair logic in VK handlers, presenters, hydration fallbacks, or gameplay use-cases.

## Verification for Q-039

Docs-only verification is sufficient for Q-039 because this slice defines boundaries only.

Required checks:

- `npm run release:preflight`;
- `git diff --check`;
- `git diff --cached --check` after staging.
