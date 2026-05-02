# Project Map

Короткая карта проекта для быстрых входов в работу. Подробные решения остаются в `README.md`, `PLAN.md` и `ARCHITECTURE.md`.

## Core Directories

- `src/app` — bootstrap и composition root.
- `src/config` — env и игровой баланс.
- `src/content` — file-first контент мира, рун и валидатор контента.
- `src/modules` — игровые модули: combat, exploration, player, rewards, runes, quests, workshop, party, world.
- `src/modules/shared` — application ports, Prisma repository, telemetry, versioned contracts.
- `src/vk` — VK transport: команды, handlers, keyboards, presenters, bot wiring.
- `src/tooling/release` — release status, evidence, preflight, local playtest и gate tooling.
- `prisma` — Prisma schema и миграции SQLite.
- `docs` — продуктовые, платформенные, QA и release notes; читать точечно, когда нужен источник решения.

## Key Files

- `src/index.ts` — production entry point.
- `src/app/bootstrap.ts` — запуск приложения.
- `src/app/composition-root.ts` — сборка зависимостей.
- `src/vk/bot.ts` — VK bot adapter.
- `src/vk/commands/catalog.ts` — canonical command/action registry.
- `src/vk/handlers/gameHandler.ts` — transport orchestrator.
- `src/modules/rewards/application/pending-reward-pipeline.ts` — pending trophy reward pipeline.
- `src/modules/rewards/domain/trophy-actions.ts` — trophy actions, hidden school trophy rules and reward deltas.
- `src/modules/combat/domain/battle-engine.ts` — facade боевого домена.
- `src/modules/exploration/application/use-cases/ExploreLocation.ts` — основной solo exploration flow.
- `src/modules/player/application/read-models/next-goal.ts` — ближайшая цель игрока.
- `src/content/validation/validate-game-content.ts` — hard validation контента и баланса.

## Commands

- `npm run check` — typecheck, content validation, build, tests.
- `npm run content:validate` — быстрая проверка контента.
- `npm run release:local-playtest` — local first-session playtest через `GameHandler`.
- `npm run release:preflight` — быстрый release preflight.
- `npm run release:status` — публичная версия по commit-based policy.
- `npm run db:generate` — Prisma client generation.
- `npm run db:deploy` — применить pending migrations к текущей SQLite DB.

## Working Rule

Для экономии контекста сначала читать `PROJECT_MAP.md` и `GAME_STATE.md`, затем только нужные файлы кода. Большие документы открывать точечно, когда нужен product или architecture source of truth.
