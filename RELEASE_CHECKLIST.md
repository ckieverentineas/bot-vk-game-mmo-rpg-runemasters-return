# Release Checklist

Используйте этот файл как gate перед релизом. Если пункт не проходит, релиз не считается готовым.

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
npm run check
npm run release:local-playtest
npm run release:status
npm run release:summary
npm run release:preflight
```

Ожидания:

- `db:generate` проходит без `EPERM`;
- `check` проходит полностью: typecheck, content validation, build, tests;
- `release:local-playtest` проходит два first-session сценария: legacy text и keyboard payload с `stateKey`;
- `release:status` показывает правдоподобное число коммитов и player-facing версию игры;
- `release:summary` не расходится с `CHANGELOG.md`;
- `release:preflight` проходит и не скрывает ошибки документов или контента.

## Runtime evidence gate

Автоматический `release:local-playtest` доказывает только первый путь: новый игрок, обучение, учебный бой, первая руна, выбор, экипировка и профиль. После него всё равно нужен ручной playtest длинных веток:

```bash
npm run release:school-evidence
npm run release:evidence
```

Релиз не готов, если evidence verdict остаётся `insufficient_evidence`.

Минимально нужно подтвердить:

- onboarding стартует и ведёт к понятному первому маршруту;
- `исследовать` может дать событие или встречу без внезапного броска в бой;
- встреча показывает выбор `В бой` / `Отступить`;
- бой читаемо показывает игрока, врага, ману, последние события и намерение врага;
- `защита` и guard-break не выглядят одинаково правильным ответом;
- победа возвращает к `Исследовать`, а не к отдельному обходному `Новый бой`;
- rune hub позволяет выбрать, надеть, снять, создать, перековать и распылить руну;
- две стартовые руны работают как равноправные слоты;
- school-first path по Пламени, Тверди, Бури и Прорицанию проходит до понятной school-награды и следующего шага;
- reward ledger не даёт duplicate reward на retry/replay;
- command intent не допускает double spend на craft/reroll/equip hot paths.

## Документы

Перед релизом должны быть синхронизированы:

- `README.md` — что есть в текущем runtime;
- `QUICKSTART.md` — как поднять и проверить проект;
- `PLAN.md` — что готово, что не доказано, что отложено;
- `CHANGELOG.md` — что изменилось для игрока и релиза;
- `ARCHITECTURE.md` — только если менялись границы модулей, persistence, replay-safety или контракты.

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
