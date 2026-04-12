# Runemasters Return — архитектура проекта

## Цели

- держать игровой движок расширяемым без разрастания transport-слоя;
- разделять чистую бизнес-логику и побочные эффекты;
- ускорить добавление новых систем: навыков рун, крафта, квестов, PvP, событий и сезонов;
- поддерживать рабочую дисциплину через тесты, changelog и commit-based релизы.

## Основной архитектурный стиль

Проект собран как модульная `DDD-lite` / `clean architecture` система.

1. `domain` — чистые функции и правила игры без Prisma и VK API.
2. `application` — use-case orchestration, проверки и сценарии.
3. `infrastructure` — Prisma-репозитории, сериализация, внешние зависимости.
4. `transport` — VK router, handler, presenter и keyboard-композиция.
5. `shared` — общие типы, ошибки и инфраструктурные утилиты.
6. `tooling` — release/versioning и вспомогательные рельсы сопровождения.

## Актуальная структура

```text
src/
  app/
    bootstrap.ts
    composition-root.ts
  config/
    env.ts
    game-balance.ts
  database/
    client.ts
    seed.ts
  modules/
    combat/
      application/
      domain/
    exploration/
      application/
    player/
      application/
      domain/
    runes/
      application/
      domain/
    shared/
      application/
      infrastructure/
    world/
      domain/
  shared/
    domain/
    types/
    utils/
  tooling/
    release/
  vk/
    commands/
    handlers/
    keyboards/
    presenters/
    router/
  index.ts
```

## Модули и зоны ответственности

### `player`

- регистрация игрока;
- профиль и распределение статов;
- derived stats, инвентарь, работа с экипированной руной.

### `exploration`

- интро-обучение и возврат в него;
- адаптивный подбор уровня угрозы;
- старт encounter;
- восстановление уже активного боя.

### `combat`

- построение snapshot боевой сессии;
- ходы игрока и врага;
- журнал боя;
- финализация боя и выдача наград.

### `runes`

- генерация рун;
- навигация по коллекции;
- экипировка, снятие, реролл и уничтожение.

### `world`

- выбор биома;
- scaling мобов;
- описание encounter и формирование snapshot врага.

### `modules/shared`

- application port `GameRepository`;
- общие application guard/helper'ы для use-case слоя;
- Prisma implementation;
- маппинг persistent state ↔ view state.

## Рельсы масштабирования

### 1. Единый каталог команд

`src/vk/commands/catalog.ts` хранит:

- все канонические команды;
- алиасы старых команд;
- маппинг динамических команд для статов, обучения и рун.

Это позволяет менять transport-слой без поиска строк по всему проекту.

### 2. Общий builder клавиатур

`src/vk/keyboards/index.ts` строит клавиатуры из layout-массивов. Новые кнопки добавляются декларативно, а не длинными chain-вызовами.

### 3. Централизованная сериализация

`src/shared/utils/json.ts` и helper'ы Prisma-репозитория убирают дублирование `JSON.parse` / `JSON.stringify` и делают работу со snapshot-состоянием предсказуемой.

### 4. Контентные контракты и валидация

`src/content/validation/validate-game-content.ts` проверяет инварианты, от которых зависит безопасное масштабирование проекта:

- непрерывное покрытие биомов по уровням;
- корректные ссылки мобов на биомы;
- валидный loot table;
- консистентность рунных архетипов и способностей;
- базовые ограничения игрового баланса и стартовой конфигурации.

Эта валидация запускается через `npm run content:validate`, входит в `npm run check`, включена в `npm run release:preflight` и вызывается перед [`seed()`](src/database/seed.ts:5), чтобы не заливать битый контент в базу.

### 5. Общие application guard'ы

`src/modules/shared/application/require-player.ts` убирает копипасту из use-case'ов и делает загрузку игрока вместе с ошибкой `player_not_found` единообразной по всему проекту.

Дополнительно `src/modules/combat/application/finalize-recovered-battle.ts` выносит в одно место сценарий авто-завершения «битого» активного боя, чтобы `combat` и `exploration` не дублировали одинаковую recovery-логику.

### 6. Чистый combat core

`src/modules/combat/domain` держит reusable helper'ы для клонирования battle state, расчёта физического урона и trim battle log. Это упрощает будущие активные навыки, статусы и эффекты поля боя.

Дополнительно [`recoverInvalidActiveBattle()`](src/modules/combat/domain/recover-active-battle.ts:1) страхует проект от зависших активных боёв, когда в snapshot уже нулевое HP, а статус ещё не был закрыт.

### 7. Адаптивная сложность

`src/modules/player/domain/player-stats.ts` рассчитывает рекомендованный уровень угрозы из нескольких источников:

- уровня персонажа;
- итоговой боевой силы;
- серии побед;
- серии поражений.

Это даёт мягкий recovery после смертей и автоматический рост давления при уверенном прогрессе.

### 8. Release discipline

`src/tooling/release/versioning.ts` фиксирует правило: каждые `100` коммитов дают новую пользовательскую версию формата `M.nn`.

- `npm run content:validate` валидирует контент и баланс до сборки;
- `npm run release:status` показывает текущее состояние версии;
- `npm run release:preflight` проверяет, что релизные документы в корне проекта существуют и не пустые.

### 9. Documentation discipline

Изменения пользовательского поведения должны синхронно обновлять:

- `README.md`
- `CHANGELOG.md`
- `PLAN.md`
- `ARCHITECTURE.md` при изменении архитектурных границ

## Как безопасно добавлять новую систему

1. Сначала определить доменные сущности и чистые функции.
2. Затем оформить use-case в `application`.
3. Протянуть зависимости через `composition-root`.
4. При необходимости добавить transport-команды в `src/vk/commands/catalog.ts`.
5. Обновить клавиатуры, presenter и handler.
6. Добавить или расширить unit tests для чистой логики.
7. Обновить `CHANGELOG.md`, `README.md`, `PLAN.md` и при необходимости `ARCHITECTURE.md`.

## Инварианты проекта

- derived stat'ы считаются в домене, а не хранятся дублирующимся слоем в БД;
- battle state хранится как snapshot и восстанавливается через repository mapper;
- игрок не настраивает уровень локации вручную, это делает доменная логика сложности;
- контентные сиды и баланс должны проходить автоматическую валидацию до seed, check и release preflight;
- транспорт не должен возвращать ручные команды управления уровнем угрозы;
- keyboard-first сценарий является основным транспортным сценарием для VK;
- VK transport не должен напрямую содержать игровую логику;
- новые функции должны добавляться через маленькие use-case'ы, а не через один разрастающийся handler;
- все новые внешние правила должны иметь одно место правды: каталог команд, config balance, release formula или repository port.

## Следующие точки роста

- активные и пассивные навыки рун;
- дополнительные боевые действия помимо базовой атаки;
- крафт и предметы поверх текущего инвентаря;
- сезонные ивенты, квесты и PvP;
- отдельный слой application DTO при росте числа transport-контрактов.
