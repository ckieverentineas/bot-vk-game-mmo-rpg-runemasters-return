# Changelog

Этот файл ведётся как журнал версий и должен отражать, что именно вошло в каждый коммит и релизную версию.

## Политика версий

- каждые `100` коммитов формируют новый релизный рубеж;
- самый первый коммит проекта = версия `0.01`;
- коммит `0.25` означает двадцать пятый коммит до рубежа `1.00`;
- коммит `1.00` — это сотый коммит;
- текущий расчёт статуса можно смотреть через `npm run release:status`.

## [0.01] - 2026-04-11

### Commit

- `fe6e840` — `chore: establish scalable project rails`

### Added

- полностью новый TypeScript-каркас проекта с модульной структурой [`src/app`](src/app), [`src/modules`](src/modules), [`src/shared`](src/shared), [`src/vk`](src/vk);
- Prisma-схема и миграция для новой модели данных в [`prisma/schema.prisma`](prisma/schema.prisma) и [`prisma/migrations/20260411114611_init/migration.sql`](prisma/migrations/20260411114611_init/migration.sql);
- нулевой интро-биом обучения и стартовый контент мира в [`src/content/world/biomes.ts`](src/content/world/biomes.ts) и [`src/content/world/mobs.ts`](src/content/world/mobs.ts);
- use-case’ы обучения [`EnterTutorialMode`](src/modules/exploration/application/use-cases/EnterTutorialMode.ts:6), [`SkipTutorial`](src/modules/exploration/application/use-cases/SkipTutorial.ts:6), [`ReturnToAdventure`](src/modules/exploration/application/use-cases/ReturnToAdventure.ts:6);
- умная динамическая сложность в [`resolveAdaptiveAdventureLocationLevel()`](src/modules/player/domain/player-stats.ts:76);
- клавиатурный VK-first flow с каталогом команд в [`src/vk/commands/catalog.ts`](src/vk/commands/catalog.ts) и клавиатурами в [`src/vk/keyboards/index.ts`](src/vk/keyboards/index.ts);
- команда и use-case удаления персонажа [`DeletePlayer`](src/modules/player/application/use-cases/DeletePlayer.ts:4);
- утилиты сериализации в [`src/shared/utils/json.ts`](src/shared/utils/json.ts);
- release tooling в [`src/tooling/release/versioning.ts`](src/tooling/release/versioning.ts) и [`src/tooling/release/release-status.ts`](src/tooling/release/release-status.ts);
- базовые тесты [`src/vk/router/commandRouter.test.ts`](src/vk/router/commandRouter.test.ts) и [`src/tooling/release/versioning.test.ts`](src/tooling/release/versioning.test.ts).

### Changed

- ручной выбор уровня локации отключён, давление мира теперь подбирается автоматически;
- бот переведён на keyboard-first сценарий;
- зависшие активные бои автоматически восстанавливаются через [`recoverInvalidActiveBattle()`](src/modules/combat/domain/recover-active-battle.ts:1);
- документация приведена к новой архитектуре: [`README.md`](README.md), [`QUICKSTART.md`](QUICKSTART.md), [`ARCHITECTURE.md`](ARCHITECTURE.md).

## [0.02] - 2026-04-12

### Commit

- `f510080` — `docs: record git history reconciliation`

### Changed

- зафиксировано выравнивание git-истории между локальным [`main`](README.md) и [`origin/main`](README.md);
- в changelog добавлена запись о backup-ветке и безопасном reconciliation git-истории.

## Шаблон следующей записи

### [0.03] - YYYY-MM-DD

#### Commit

- `hash` — `message`

#### Added

- ...

#### Changed

- ...

#### Fixed

- ...
