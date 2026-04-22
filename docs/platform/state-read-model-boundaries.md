# State and Read Model Boundaries v1

## Status

- Status: `document-first platform policy v1`
- Scope: persisted source-of-truth state, derived read models, and the decision boundary between them.
- Runtime impact: no schema change, no Prisma migration, no new storage owner.
- Source references: `ARCHITECTURE.md`, `docs/platform/persistence-versioning-rules.md`, `docs/platform/player-state-versioning-policy.md`, `docs/reviews/phase-1-exit-gate.md`.

## Goal

Gameplay state must have one clear owner. Screens, telemetry evidence, and helper projections may derive useful views from that owner, but they must not silently become a second truth.

This policy closes the Phase 1 document-first sign-off for source-of-truth state vs derived read models. Legacy battle fallback retirement is governed separately by `docs/platform/battle-fallback-retirement-policy.md`.

## Core rule

Persisted source-of-truth is the minimum state required to continue, replay, recover, or audit gameplay mutations.

Derived read models are rebuildable views over source-of-truth state, ledgers, snapshots, and static content. They can shape copy, buttons, telemetry payloads, release evidence, and QA summaries, but they must not be mutated or stored as authoritative gameplay state.

## Persisted source-of-truth owners

### Player aggregate tables

The mutable player aggregate is table-backed and hydrated into runtime `PlayerState` by the Prisma infrastructure boundary:

- `Player`;
- `PlayerProgress`;
- `PlayerInventory`;
- `Rune`;
- `PlayerSchoolMastery`;
- `PlayerSkill`.

These records own identity, progression counters, inventory balances, rune ownership and equip slots, school mastery experience/rank, and action-skill growth.

### Battle state

`BattleSession` owns active and completed battle state.

Current battle source-of-truth fields are:

- versioned `BattleSnapshot`;
- `actionRevision`;
- encounter status and active battle pointer;
- legacy `playerSnapshot`, `enemySnapshot`, `log`, and `rewardsSnapshot` fallback columns until the migration window defined in `docs/platform/battle-fallback-retirement-policy.md`.

The snapshot is persisted truth because the runtime must resume the same combat state across retry, restart, rollback, and stale-command paths. Battle readability helpers are separate read models.

### Ledgers and mutation receipts

Append-only and replay records own exact-once facts:

- `RewardLedgerRecord` for committed reward claims and replay-safe reward results;
- `CommandIntentRecord` for command replay and stale/retry decisions;
- `DeletePlayerReceipt` for destructive-account-operation receipts;
- telemetry records for evidence that an event happened, not for gameplay decisions.

A ledger fact can be used by a read model, but the read model must not replace the ledger.

### Static authored content

Authored content and balance definitions are source-of-truth for definitions, not for player mutation state:

- `src/content/**`;
- school, enemy, encounter, quest, rune, and balance definitions;
- validator rules that protect shipped content contracts.

Changing authored content can change what a read model displays or unlocks, but it should not create hidden player state.

## Derived read-model examples

### Quest book

`src/modules/quests/application/read-models/quest-book.ts` derives quest chapter progress and readiness from `PlayerState`, existing counters, runes, inventory, school mastery, skills, and reward-ledger facts.

The persisted truth for a claimed quest reward remains `RewardLedgerRecord`. A separate `PlayerQuestState` table is needed only when quest progress stops being rebuildable: branch choices, hidden/revealed stages, accepted/failed lifecycle, per-quest counters, or ordered multi-step rewards.

### Next goal

`src/modules/player/application/read-models/next-goal.ts` derives player-facing guidance for main menu, return recap, rune hub, battle result, and release evidence.

The next goal is not persisted because it can be recomputed from `PlayerState`, active battle state, static content, and current progression rules. Persisting a goal becomes valid only if accepting that goal creates an irreversible contract or a server-owned schedule.

### School mastery

`PlayerSchoolMastery` is source-of-truth for school experience and rank.

School recognition, school-facing copy, novice payoff hints, next-goal wording, and acquisition summaries are derived read models. They may explain mastery, but they must not duplicate mastery experience, rank, or unlock facts in a presenter-owned field.

### Battle snapshot and battle clarity

`BattleSnapshot` is persisted source-of-truth for mutable combat state.

Battle clarity, acquisition summary, compact combat labels, and school payoff explanations are derived read models over `BattleSnapshot`, `PlayerState`, `LoadoutSnapshot`, and static content. They can make combat easier to read without adding a second combat state machine.

## Decision checklist

Persist new state only when at least one of these is true:

- future mutations or rewards depend on it and it cannot be rebuilt;
- exact-once reward safety, replay, rollback, or audit behavior depends on it;
- a player choice, branch, lifecycle, cooldown, or hidden/revealed fact must survive across sessions;
- recovering from a crash or stale command requires the exact value that existed at mutation time.

Keep it as a read model when all of these are true:

- it can be rebuilt from existing tables, ledgers, snapshots, and authored content;
- it exists for copy, UX, QA, telemetry evidence, or release reporting;
- no gameplay mutation needs the value as an independent input;
- stale output can be safely recomputed on the next request.

## Anti-patterns

- storing presenter copy as gameplay state;
- adding `questCompleted` when completion derives from existing counters and ledger facts;
- persisting `nextGoalType` only because multiple screens show the same hint;
- making telemetry authoritative for rewards, unlocks, or progression;
- duplicating battle/player snapshot fields in transport-owned state;
- expanding `RewardLedgerRecord` into a generic quest-state store.

## Boundary table

| Flow | Persisted source-of-truth | Derived read model | Persist more only when |
|---|---|---|---|
| Quest book | `PlayerState` tables, `RewardLedgerRecord`, authored quest definitions | Quest chapter progress, readiness, claim/replay copy | Branches, hidden stages, lifecycle, per-quest counters, or multi-step reward state appear |
| Next goal | `PlayerState`, active `BattleSession`, authored content | Main-menu, return-recap, rune-hub, battle-result guidance | Accepting a goal creates an irreversible player/server contract |
| School mastery | `PlayerSchoolMastery`, rune/content definitions | Recognition, school payoff copy, unlock explanation, acquisition summary | A new independent school choice or doctrine state cannot be derived from mastery/runes |
| Battle snapshot | `BattleSession`, `BattleSnapshot`, `LoadoutSnapshot`, reward ledgers | Battle clarity, compact labels, school payoff explanation | A combat value must survive replay/restart and cannot be derived from the snapshot |

## Verification expectations

For Q-037, docs-only verification is sufficient because this policy adds no schema and no runtime behavior.

Future slices must choose the matching verification path:

- read-model-only change: targeted read-model/presenter tests plus release or preflight checks when evidence output changes;
- storage change: Prisma migration, hydration or contract tests, fixtures, and rollback/replay docs;
- reward-bearing change: ledger/replay tests and duplication-matrix sync;
- content-derived read model: `npm run content:validate` plus the relevant code slice checks.
