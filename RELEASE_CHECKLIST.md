# Release Checklist

Используйте этот файл как gate перед релизом. Если пункт не проходит, выпуск останавливается до исправления или явного release-owner решения.

## Перед проверками

1. Убедиться, что рабочая ветка чистая или все изменения понятны:

```bash
git status --short --branch
```

2. Если Git ругается на `dubious ownership`, настроить `safe.directory` или запускать релизные команды в среде, где Git доступен. `release:status` не должен показывать `0.00` только из-за ошибки чтения истории.

3. Остановить запущенного бота перед Prisma-командами. На Windows живой бот может держать `query_engine-windows.dll.node` и ломать `npm run db:generate` через `EPERM`.

4. Для production SQLite сделать backup базы до любых schema/data операций.

## Технический gate

В чистом или предсказуемом окружении:

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run check
npm run release:local-playtest
npm run release:school-evidence
npm run release:evidence
npm run release:preflight
npm run release:gate
```

Ожидания:

- `db:generate` проходит без `EPERM`;
- `db:deploy` применяет все pending Prisma migrations к текущему `DATABASE_URL` до локального playtest;
- `check` проходит полностью: typecheck, content validation, build, tests;
- если менялись school/enemy/encounter/quest/season packages, изменения сверены с `docs/content/content-pipeline-plan.md` и `docs/content/validator-scope.md`;
- `release:local-playtest` проходит два first-session сценария: legacy text и keyboard payload с `stateKey`, плюс R0 party stability и R1 early-game guidance: `💡` next-step hints, pending reward hint и post-victory navigation buttons;
- `release:school-evidence` показывает школьный путь до редкой печати;
- `release:evidence` разделяет findings на blocker, manual decision и info;
- `release:preflight` проходит и не скрывает ошибки документов или контента;
- `release:gate` повторяет локальный сценарий целиком и проверяет release-owner decisions, economy source/sink, manual playtest guide и sync-документ.

## Runtime evidence gate

Автоматический `release:local-playtest` доказывает первый путь нового игрока, school novice evidence по четырём школам, R0 party stability и R1 early-game guidance: `💡`-подсказки следующего шага, подсказку на pending-добыче и кнопки после победы для добычи, рун, исследования и пати. После него всё равно нужен ручной playtest длинных веток:

```bash
npm run release:school-evidence
npm run release:evidence
```

Gate останавливает выпуск, если evidence содержит blocker findings или manual decision без записи в `docs/release/manual-decisions.json`.

Q-006 evidence snapshot: school novice trial + aligned `UNUSUAL` reward подтверждены для Пламени, Тверди, Бури и Прорицания. Оставшиеся runtime gaps находятся после novice payoff: equip sign/loadout engagement по школам и отсутствие `return_recap_shown` в текущем окне.

Q-022 manual snapshot: pending trophy collect/replay подтверждён на local handler уровне в `docs/testing/pending-trophy-manual-playtest-q022.md`. Повтор старого trophy payload не добавил ресурсы или skill progress повторно; live VK replay остаётся optional smoke перед релизом.

Минимально нужно подтвердить:

- onboarding стартует и ведёт к понятному первому маршруту;
- `исследовать` может дать событие или встречу без внезапного броска в бой;
- встреча показывает выбор `В бой` / `Отступить`;
- бой читаемо показывает игрока, врага, ману, последние события и намерение врага;
- `защита` и guard-break не выглядят одинаково правильным ответом;
- победа возвращает к `Исследовать`, а не к отдельному обходному `Новый бой`;
- rune hub позволяет выбрать, надеть, снять, создать, перековать и распылить руну;
- две стартовые руны работают как равноправные слоты;
- school-first path по Пламени, Тверди, Бури и Прорицанию проходит до понятной school-награды, установки знака и следующего шага;
- reward ledger не даёт duplicate reward на retry/replay;
- command intent не допускает double spend на craft/reroll/equip hot paths.

## Документы

Перед релизом должны быть синхронизированы:

- `README.md` — что есть в текущем runtime;
- `QUICKSTART.md` — как поднять и проверить проект;
- `PLAN.md` — что готово, что не доказано, что отложено;
- `CHANGELOG.md` — что изменилось для игрока и релиза;
- `ARCHITECTURE.md` — только если менялись границы модулей, persistence, replay-safety или контракты.
- `docs/content/content-pipeline-plan.md` — если менялись правила, полнота или review cadence для content packages.

Generated reports в `docs/testing/*-evidence-report.md` можно хранить локально как артефакты конкретного прогона, но они не заменяют `PLAN.md` и `CHANGELOG.md`.

## Production handoff

Перед выкладкой зафиксировать:

- где лежит `.env`;
- какой `DATABASE_URL` используется;
- где находится SQLite backup;
- какой командой запускается процесс;
- где читать logs;
- как остановить бота;
- как откатить build и базу.

## Минимальный критерий готовности

- technical gate зелёный;
- runtime evidence gate зелёный;
- player-facing версия из `release:status` и changelog согласованы;
- документация не спорит с runtime;
- production handoff записан;
- cut/deferred scope из `PLAN.md` не попал в релиз случайно.
