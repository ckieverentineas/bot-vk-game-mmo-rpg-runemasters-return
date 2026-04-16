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

## [0.03] - 2026-04-12

### Commit

- `worktree` — `refactor: tighten scaling rails and release workflow`

### Added

- общий application helper загрузки игрока [`requirePlayerByVkId()`](src/modules/shared/application/require-player.ts:9) и [`requirePlayerById()`](src/modules/shared/application/require-player.ts:19), чтобы новые use-case'ы не дублировали проверку `player_not_found`;
- общий сценарий авто-финализации зависших боёв [`finalizeRecoveredBattleIfNeeded()`](src/modules/combat/application/finalize-recovered-battle.ts:11);
- preflight-скрипт [`src/tooling/release/release-preflight.ts`](src/tooling/release/release-preflight.ts) и команда `npm run release:preflight` для быстрой релизной проверки документов и версии;
- план масштабирования проекта в [`PLAN.md`](PLAN.md).

### Changed

- из transport-слоя удалены устаревшие команды ручной смены уровня угрозы, чтобы у адаптивной сложности осталось одно место правды в [`resolveAdaptiveAdventureLocationLevel()`](src/modules/player/domain/player-stats.ts:76);
- use-case'ы `player`, `exploration`, `combat` и `runes` переведены на единый guard загрузки игрока;
- логика восстановления «битого» активного боя больше не размножается между [`ExploreLocation`](src/modules/exploration/application/use-cases/ExploreLocation.ts:10), [`GetActiveBattle`](src/modules/combat/application/use-cases/GetActiveBattle.ts:8) и [`PerformBattleAction`](src/modules/combat/application/use-cases/PerformBattleAction.ts:9);
- release tooling собран вокруг единого snapshot-состояния в [`resolveReleaseStatus()`](src/tooling/release/versioning.ts:29);
- корневая документация синхронизирована под дальнейшее масштабирование контента и более быструю поставку обновлений.

### Fixed

- убрано мёртвое ветвление вокруг отключённого use-case ручного выбора уровня локации;
- снижён риск расхождения пользовательских ошибок и recovery-сценариев между разными модулями.
- `npm run release:preflight` теперь завершает процесс с ненулевым кодом, если обязательные релизные документы отсутствуют или пусты.

## [0.04] - 2026-04-12

### Commit

- `worktree` — `feat: validate content rails before scale-out`

### Added

- автоматическая валидация контентных сидов и базового баланса в [`validateGameContent()`](src/content/validation/validate-game-content.ts:329);
- CLI-проверка [`src/tooling/release/content-validation.ts`](src/tooling/release/content-validation.ts) и команда `npm run content:validate`;
- тесты контентной валидации [`src/content/validation/validate-game-content.test.ts`](src/content/validation/validate-game-content.test.ts) и тесты адаптивной сложности [`src/modules/player/domain/player-stats.test.ts`](src/modules/player/domain/player-stats.test.ts).

### Changed

- [`npm run check`](package.json:10) теперь включает контентную валидацию до тестов и сборки;
- [`release-preflight`](src/tooling/release/release-preflight.ts:73) теперь проверяет не только документы, но и валидность контента и баланса;
- [`seed()`](src/database/seed.ts:5) больше не заливает сиды в базу, если игровые данные нарушают инварианты;
- корневая документация синхронизирована под дальнейшее безопасное масштабирование контента.

### Fixed

- снижен риск тихо сломать покрытие биомов, loot table, ссылки мобов на биомы или связи архетипов со способностями при быстром добавлении контента;
- релизные проверки теперь ловят не только пустые документы, но и битые контентные данные.
- контентная валидация теперь отлавливает ссылки архетипов на способности чужого архетипа, а не только отсутствие способности или неверный тип;
- `release-preflight` теперь точнее сообщает, нужно исправлять документы или контент с балансом.

## [0.05] - 2026-04-12

### Commit

- `worktree` — `chore: formalize release checklist and content-to-transport bridge`

### Added

- единый чек-лист релизной поставки в `RELEASE_CHECKLIST.md`;
- GitHub Actions workflow `.github/workflows/ci.yml` для минимального CI-пайплайна;
- доменные helper'ы описания рунного контента [`describeRuneContent()`](src/modules/runes/domain/rune-abilities.ts:49) и [`listRuneArchetypes()`](src/modules/runes/domain/rune-abilities.ts:21);
- тесты рунного контента в [`src/modules/runes/domain/rune-abilities.test.ts`](src/modules/runes/domain/rune-abilities.test.ts).

### Changed

- [`RuneFactory.create()`](src/modules/runes/domain/rune-factory.ts:21) теперь создаёт руны с архетипом и способностями из контентного каталога;
- [`PrismaGameRepository.createRune()`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts:267) и финализация наград протягивают архетип и списки способностей до persistence;
- [`renderRuneScreen()`](src/vk/presenters/messages.ts:125) и [`renderAltar()`](src/vk/presenters/messages.ts:138) показывают рунный контент без ручного дублирования transport-описаний;
- документация и план синхронизированы под единый локальный и CI-релизный процесс.

### Fixed

- скрафченные и выпавшие руны больше не теряют архетип и способности при сохранении в БД;
- контентные правки архетипов и способностей теперь доходят до VK-представления без ручной правки transport-слоя.

## [0.06] - 2026-04-12

### Commit

- `worktree` — `test: add release summary and smoke verification rails`

### Added

- генератор пользовательского release summary в `src/tooling/release/release-summary-generator.ts` и CLI-команда `npm run release:summary`;
- тесты release summary в `src/tooling/release/release-summary.test.ts`;
- smoke-проверки сценариев transport-уровня в `src/vk/handlers/gameHandler.smoke.test.ts`.

### Changed

- релизная документация и архитектурная карта синхронизированы под новый summary/smoke-процесс;
- `README.md` теперь фиксирует smoke-путь через `GameHandler` и использование `release:summary`.

### Fixed

- ручная подготовка release summary больше не требуется для базового релизного цикла;
- ключевые пользовательские сценарии теперь проверяются до релиза без реального VK API.
- `release:summary` теперь опирается на последнюю закоммиченную changelog-запись и не теряет недокументированные коммиты из-за локального черновика;
- `release:summary --range` больше не подставляет необработанный ввод в shell-команду.

## [0.07] - 2026-04-16

### Commit

- `worktree` — `fix: harden release candidate against duplicate battle and rune mutations`

### Added

- repository-level регрессионные тесты [`src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts) на идемпотентность финализации боя, underflow-защиту инвентаря и reuse активного боя;
- дополнительные smoke-ожидания для новых player-facing CTA в [`src/vk/handlers/gameHandler.smoke.test.ts`](src/vk/handlers/gameHandler.smoke.test.ts).

### Changed

- [`PrismaGameRepository`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts) теперь проводит craft/reroll/destroy рун атомарно, не допускает отрицательных остатков инвентаря и повторно использует уже активный бой вместо создания дубликата;
- сохранение и финализация боя больше не должны повторно применять прогресс и награды, если один и тот же бой прилетел повторным входящим событием;
- [`renderWelcome()`](src/vk/presenters/messages.ts:42), [`renderLocation()`](src/vk/presenters/messages.ts:119), [`renderRuneScreen()`](src/vk/presenters/messages.ts:140), [`renderAltar()`](src/vk/presenters/messages.ts:157) и [`renderBattle()`](src/vk/presenters/messages.ts:228) стали короче и добавили явный следующий шаг;
- клавиатуры рун и алтаря получили более понятные labels в [`src/vk/keyboards/index.ts`](src/vk/keyboards/index.ts).

### Fixed

- спам `атака` больше не должен дублировать опыт, пыль, осколки и rune-drop при повторной финализации одного и того же боя;
- повторные `создать`, `сломать` и reroll-команды больше не должны уводить осколки в минус или повторно возвращать награду за уже удалённую руну;
- боевой лог наград больше не показывает внутренние коды вида `usual: 2`, а пишет человекочитаемые названия осколков.

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
