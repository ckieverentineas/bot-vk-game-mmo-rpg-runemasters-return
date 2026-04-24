# Component Refactor Roadmap

## Status

- Status: `active cleanup roadmap`
- Created: `2026-04-24`
- Scope: component-oriented architecture, functional domain core, safer maintenance rails.
- Progress policy: one task = one chat request = one verification pass = one commit.
- Overall cleanup progress after RF-017 lands: `17/18 = 94%`.
- Closed tasks: `RF-001`, `RF-002`, `RF-003`, `RF-004`, `RF-005`, `RF-006`, `RF-007`, `RF-008`, `RF-009`, `RF-010`, `RF-011`, `RF-012`, `RF-013`, `RF-014`, `RF-015`, `RF-016`, `RF-017`.

## Goal

Bring the project to a shape where a developer can add features without guessing where logic belongs.

The target style is:

- component-oriented orchestration at the edges;
- pure functional domain rules in the core;
- explicit application services for workflows;
- infrastructure adapters kept behind narrow ports;
- VK transport responsible only for command routing, presentation and reply composition;
- comments and annotations used only for non-obvious intent, constraints or safety rails.

## Current Architecture Map

The project already has a useful `DDD-lite` skeleton:

- `src/modules/*/domain` holds most game rules and read-model calculations;
- `src/modules/*/application` owns use-cases and orchestration;
- `src/modules/shared/infrastructure` owns Prisma, random and telemetry adapters;
- `src/vk` owns router, handlers, presenters and keyboards;
- `src/content` owns authored game content and validation;
- `src/tooling` owns release and evidence commands.

After RF-011, Prisma persistence is split around extracted `command-intent`, `player`, `party` and `workshop` components, with shared inventory/error helpers beside the adapter. The root `PrismaGameRepository` still implements `GameRepository`, but it now acts more like a facade while the remaining battle/reward/rune persistence is easier to carve next.

After RF-012, `src/shared/types/game.ts` is a compatibility barrel over context files in `src/shared/types`: `combat`, `player`, `rewards`, `runes`, `world`, `party`, `inventory` and `stats`. New code can import from the narrow owner while existing modules keep working through the old path.

After RF-013, shared typed test factories live in `src/shared/testing`: game factories build player, battle, rune, party and world fixtures, and repository factories cover simple player lookup ports. High-churn VK, local playtest, exploration, party and register tests now reuse those fixtures instead of carrying full inline objects.

After RF-014, VK reply composition has a shared `screenReply` boundary and the daily trace, party screen and party exploration event flows live in focused responders. `GameHandler` now routes those use-case results without manually pairing presenters and keyboards.

After RF-015, `message-formatting.ts` owns shared VK copy primitives for currency balances, signed reward amounts, battle reward payloads, progress counters, Russian count phrases and next-goal CTA lines. Battle, home, profile, reward, quest and rune presenters now consume those helpers instead of rebuilding the same copy inline.

After RF-016, reward assembly has clearer application boundaries: pending trophy ledger creation and applied trophy ledger creation live in `rewards/application/pending-reward-pipeline.ts`, while quest reward and daily trace economy telemetry share `reward-economy-telemetry.ts`.

After RF-017, proven-unused exported helpers were removed from crafting, quests, rune ability lookup, school progression helpers and reward contracts. Historical review docs that can conflict with current four-school runtime scope now say which current docs/tests supersede them.

The main composition point is `src/app/composition-root.ts`: it builds one Prisma repository, one world catalog, one random source, telemetry, and all use-case classes.

## Pressure Points

These are the current hotspots where future feature work is most likely to cause regressions.

| Area | Current pressure | Refactor direction |
|---|---|---|
| `GameRepository` port | One broad interface owns player, battle, rewards, runes, party, workshop, telemetry log and command intents. | Introduce scoped ports per use-case family while keeping Prisma as one adapter behind them. |
| `PrismaGameRepository` | Large transaction adapter with many unrelated workflows in one class. | Extract persistence components around player, battle, rewards, rune, party and workshop mutations. |
| `BattleEngine` | Turn flow, party flow, actions, enemy intent, consumables and resource refresh live together. | Keep a facade, move rules into small domain components. |
| `PerformBattleAction` | Replay, recovery, party timeout, action resolution, enemy response, rewards and persistence share one use-case. | Split into application services with pure inputs/outputs. |
| Solo and party exploration | Similar battle-start/event flow exists in `ExploreLocation` and `ExploreParty`. | Build shared exploration outcome and battle-start components with solo/party adapters. |
| Command intent handling | Replay and stale-state logic repeats in many use-cases. | Create a reusable mutation intent guard with typed command families. |
| `src/shared/types/game.ts` | Many domains share one large type file. | Split by bounded context, then keep a compatibility barrel if needed. |
| VK presenters/keyboards | Better than before, but still many screen-specific formatters and repeated CTA patterns. | Move toward screen models: use-case/read-model -> presenter -> keyboard. |
| Test fixtures | Many tests create full player/battle objects inline. | Add shared typed factories per component to reduce brittle setup. |
| Legacy/recovery rails | Some legacy snapshot and legacy text paths are still valid production guards. | Annotate why they remain, then retire only through explicit policy tasks. |

## Refactor Rules

1. Do not mix behavior changes with structural refactors unless the task explicitly says so.
2. Add characterization tests before moving risky behavior.
3. Keep public use-case behavior stable while internals move.
4. Prefer pure functions for calculations, decisions, filtering, formatting and state transitions.
5. Keep side effects at the application or infrastructure edge: repository calls, telemetry, random rolls, clocks, VK replies.
6. Comments are allowed in Russian when they explain why a guard exists, why a legacy path remains, or what invariant protects replay/recovery.
7. Every completed task updates the relevant docs or `CHANGELOG.md`, runs verification and commits separately.
8. Deleting code is allowed only after `rg` proves it is unused or tests prove the replacement path is canonical.

## Target Component Shape

Use this as the default shape for new or refactored areas:

```text
src/modules/<feature>/
  domain/
    <pure-rule>.ts
    <pure-rule>.test.ts
  application/
    <workflow-service>.ts
    read-models/
    use-cases/
  infrastructure/
    <adapter>.ts
  presentation/      optional, only if transport-neutral screen models become useful
```

Transport remains in `src/vk`, but it should consume application results and screen/read-models instead of calculating gameplay decisions.

## One-Request Queue

Each item below should be handled in a separate chat request unless a task becomes obviously smaller while working.

| Id | Progress | Task | Done when |
|---|---:|---|---|
| RF-001 | 6% | Map architecture and cleanup rails. | This roadmap exists, is linked, verified and committed. |
| RF-002 | 11% | Extract combat turn-state helpers from `BattleEngine`. | Party turn, player/enemy turn ownership and resource refresh are isolated with tests. |
| RF-003 | 17% | Extract player action resolution from `BattleEngine`. | Attack, defend, rune skill and consumable behavior live in focused domain components. |
| RF-004 | 22% | Extract enemy action resolution from `BattleEngine`. | Basic attack, prepared intents and signature reaction execution are focused and tested. |
| RF-005 | 28% | Reduce `BattleEngine` to a facade. | Public API remains stable, internals delegate to small functions. |
| RF-006 | 33% | Split battle application orchestration. | Recovery, enemy response, party timeout and reward finalization are separate services. |
| RF-007 | 39% | Unify solo/party battle start. | `ExploreLocation` and `ExploreParty` use shared battle-start builders. |
| RF-008 | 44% | Unify standalone exploration event persistence. | Solo and party events share a small event-effect component where possible. |
| RF-009 | 50% | Add reusable command intent guard. | Replay/stale checks stop repeating across rune, battle, workshop and exploration use-cases. |
| RF-010 | 56% | Introduce scoped repository ports. | Use-cases depend on smaller ports while Prisma can still implement them in one adapter. |
| RF-011 | 61% | Decompose Prisma persistence components. | Player, battle, reward, rune, party and workshop persistence logic is navigable by domain. |
| RF-012 | 67% | Split shared game types by context. | Combat, player, rewards, runes and world types have local owners and a compatibility barrel. |
| RF-013 | 72% | Create shared test factories. | Common player/battle/repository fixtures replace repeated inline objects in high-churn tests. |
| RF-014 | 78% | Normalize VK screen composition. | Main flows follow `screen/read-model -> presenter -> keyboard -> responder`. |
| RF-015 | 83% | Consolidate VK copy helpers. | Repeated resource, reward, progress and CTA formatting lives in named helpers. |
| RF-016 | 89% | Consolidate reward pipeline components. | Victory, pending reward, quest reward and daily trace flows share clear reward boundaries. |
| RF-017 | 94% | Retire proven dead code and stale docs. | Unused helpers and superseded docs are removed or marked with an explicit replacement. |
| RF-018 | 100% | Final architecture pass. | Dependency direction, docs, tests and changelog are consistent after the cleanup series. |

## Progress Reporting Format

After every cleanup commit, report:

```text
Готово: <percent>.
Коммит: <hash> <message>
Закрыто: <RF-id>
Дальше: <next RF-id>
Проверка: <commands>
```

This makes the long cleanup visible without pretending the whole refactor can be safely done in one giant patch.
