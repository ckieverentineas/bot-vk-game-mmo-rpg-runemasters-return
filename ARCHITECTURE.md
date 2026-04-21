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
      application/
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
- профиль, mastery и player-facing growth framing;
- school mastery и базовая progression-ось поверх школы рун;
- derived stats, инвентарь, работа с экипированной руной.

### `exploration`

- интро-обучение и возврат в него;
- адаптивный подбор уровня угрозы;
- старт encounter;
- восстановление уже активного боя.

### `combat`

- построение snapshot боевой сессии;
- ходы игрока и врага через единый battle action resolver;
- журнал боя;
- финализация боя и выдача наград;
- рунные боевые действия, mana/cooldown state, временные эффекты и enemy intent внутри battle snapshot.

### `runes`

- генерация рун;
- навигация по коллекции через paged hub поверх одного `currentRuneIndex`;
- экипировка, снятие, реролл и уничтожение.

### `world`

- выбор биома;
- scaling мобов;
- описание encounter и формирование snapshot врага.
- FOMO-safe PvE adventure director для authored framing важных встреч без таймеров, streak'ов и ручной раздачи силы.

### `modules/shared`

- application port `GameRepository`;
- общие application guard/helper'ы для use-case слоя;
- Prisma implementation;
- маппинг persistent state ↔ view state;
- idempotency-защита для боевых и рунных мутаций, чтобы повторные входящие команды не дублировали награды и не уводили инвентарь в минус.

## Рельсы масштабирования

### 1. Единый каталог команд

`src/vk/commands/catalog.ts` хранит:

- все канонические команды;
- алиасы старых команд;
- маппинг динамических команд для статов, обучения и рун.

Это позволяет менять transport-слой без поиска строк по всему проекту.

### 2. Общий builder клавиатур

`src/vk/keyboards/index.ts` строит клавиатуры из layout-массивов. Новые кнопки добавляются декларативно, а не длинными chain-вызовами.

В текущем rune UX это позволяет держать один и тот же action set для unified rune hub: page navigation, быстрый выбор 5 рун на странице, slot selection, equip primary/support, unequip, craft, reroll и destroy без размножения handler-веток.

### 3. Централизованная сериализация

`src/shared/utils/json.ts` и helper'ы Prisma-репозитория убирают дублирование `JSON.parse` / `JSON.stringify` и делают работу со snapshot-состоянием предсказуемой.

### 4. Контентные контракты и валидация

`src/content/validation/validate-game-content.ts` проверяет инварианты, от которых зависит безопасное масштабирование проекта:

- непрерывное покрытие биомов по уровням;
- корректные ссылки мобов на биомы;
- валидный loot table;
- консистентность рунных архетипов и способностей;
- базовые ограничения игрового баланса и стартовой конфигурации.

Текущее правило: `archetypeCode` остаётся внутренним content/storage key, а player-facing **школа** выводится через canonical `SchoolDefinition` read-model поверх этого key. Это позволяет развести fantasy-domain и combat-role без миграции базы на раннем этапе и не держать отдельную hand-written карту school presentation. Тот же read-model теперь используется в onboarding-presenter слое, чтобы welcome / tutorial / rune hub говорили об одной и той же school identity. Return recap и battle result больше не собирают next-step guidance локально в `transport`: ближайшая school-веха теперь выводится через общий application read-model [`src/modules/player/application/read-models/next-goal.ts`](src/modules/player/application/read-models/next-goal.ts) поверх текущего `PlayerState`. Rune hub теперь явно показывает `основу` и `поддержку`, но только `основа` остаётся источником активной боевой руны; support-slot живёт как bounded pre-battle breadth до отдельного multi-action review.

Эта валидация запускается через `npm run content:validate`, входит в `npm run check`, включена в `npm run release:preflight`, вызывается через [`seed()`](src/database/seed.ts:3) как fast validation hook и дополнительно исполняется на старте приложения перед сборкой runtime-каталога мира.

Статический authored content теперь живёт в `src/content/**` и читается рантаймом напрямую через file-backed world catalog, а Prisma/SQLite остаются только для изменяемого состояния игрока, боёв, наград, intent'ов и telemetry.

### 5. Общие application guard'ы

`src/modules/shared/application/require-player.ts` убирает копипасту из use-case'ов и делает загрузку игрока вместе с ошибкой `player_not_found` единообразной по всему проекту.

Дополнительно `src/modules/combat/application/finalize-recovered-battle.ts` выносит в одно место сценарий авто-завершения «битого» активного боя, чтобы `combat` и `exploration` не дублировали одинаковую recovery-логику.

Для player-facing guidance приложение теперь также держит отдельный read-model ближайшей цели: `main menu`, `return recap`, `rune hub` и `battle result` читают один и тот же `next-goal` слой, а не размазывают разные эвристики по `vk/presenters`.

### 6. Чистый combat core

`src/modules/combat/domain` держит reusable helper'ы для клонирования battle state, расчёта физического урона и trim battle log. Это упрощает будущие активные навыки, статусы и эффекты поля боя.

Для reward-bearing randomness отдельный boundary теперь задаётся через `GameRandom`: craft / reroll / victory rune drop больше не должны зависеть от transport-owned или hidden inline randomness в use-case flow.

Для keyboard rune mutations (`craft` / `reroll` / `destroy`) transport теперь может передавать `intentId`, а authoritative replay receipt живёт в persistence-слое через `CommandIntentRecord`. Это не превращает transport в источник истины, а лишь даёт серверу stable dedupe envelope для одного намерения игрока.

Дополнительно [`recoverInvalidActiveBattle()`](src/modules/combat/domain/recover-active-battle.ts:1) страхует проект от зависших активных боёв, когда в snapshot уже нулевое HP, а статус ещё не был закрыт.

Текущий shipped slice намеренно оставляет battle actions минимальными, а улучшения делает в двух местах:

- domain: ранний initiative/fairness tuning и rarity caps для natural rune drops;
- transport: compact event-first presentation вместо перегруженного полного stat dump на каждом ходу.

После первого playable rune combat slice battle snapshot дополнительно хранит:

- active rune loadout игрока;
- состояние маны и отката активного действия;
- временную защиту/guard как часть player snapshot, а не transport-состояния.
- passive school identity остаётся derivable из `passiveAbilityCodes`, а не требует отдельной persistence-схемы.

Следующий foundation-срез закрепляет это уже как platform contract:

- `BattlePlayerSnapshot.runeLoadout` остаётся battle read-model'ю;
- параллельно в `BattleSession.playerLoadoutSnapshot` теперь живёт versioned `LoadoutSnapshot`, который переживает save/load независимо от cooldown/runtime-полей;
- canonical reward write-path больше не опирается только на `battle.rewards`, а фиксирует `RewardIntent` и append-only `RewardLedger` для exact-once claim semantics.
- `BattleSession.actionRevision` стал compare-and-swap guard для active battle mutations, чтобы stale branch не мог перезаписать более новый turn state.
- `BattleSession.battleSnapshot` стал versioned envelope для mutable battle JSON, а legacy `playerSnapshot` / `enemySnapshot` / `log` / `rewardsSnapshot` остаются compatibility fallback до отдельного migration window; при rollback/new-runtime re-entry версия battle snapshot доверяется только если её `actionRevision` совпадает с revision строки.

Следующий shipped tactics layer добавляет ещё локальные боевые контракты внутри snapshot:

- `DEFEND` как универсальное действие игрока, работающее через уже существующий `guardPoints`;
- `enemy.intent` для телеграфируемого тяжёлого удара без выхода в отдельную AI-state-machine.
- тот же `enemy.intent` теперь несёт и anti-guard pattern, поэтому игроку приходится читать не только “когда защищаться”, но и “когда защита будет плохим ответом”.
- battle-only passive resolver добавляет school identity поверх существующего snapshot-контракта без миграции базы и без новых transport-owned состояний.
- battle loadout snapshot теперь также может нести rarity экипированной руны как optional read-model поле, чтобы compact combat clarity мог различать первый знак школы и более поздние school payoff стадии без отдельной persistence-системы.

### 7. Адаптивная сложность

`src/modules/player/domain/player-stats.ts` рассчитывает рекомендованный уровень угрозы из нескольких источников:

- уровня персонажа;
- итоговой боевой силы;
- серии побед;
- серии поражений.

Это даёт мягкий recovery после смертей и автоматический рост давления при уверенном прогрессе.

Дополнительно ранняя версия сложности теперь меньше переоценивает `intelligence` и `magicDefence`, пока в бою нет полноценной магической action loop.

### 7.5. Мастера испытаний

`src/modules/world/domain/game-master-director.ts` добавляет чистый PvE framing для важных encounters:

- tutorial cue для первого учебного боя;
- school-aware cue для elite/boss проверок;
- общий build-check cue для boss-встреч без привязки к школе.

Этот слой не хранит состояние, не выдаёт награды, не зависит от календаря и не является live-ops системой. Его задача — усилить читаемость сцены и тактического вопроса, не создавая FOMO.

### 7.6. Attrition boundary

Долговременные HP/мана между боями пока не являются runtime-контрактом. Включать их как прямую запись в `PlayerState` нельзя без отдельного recovery/rest use-case, UI-состояния до входа в бой, balance pass по early PvE и exploit review. Текущий бой остаётся snapshot-сессией, где здоровье и мана рассчитываются из derived stats при создании encounter.

Следующий progression slice также меняет акцент growth-системы:

- новые уровни больше не должны автоматически раздавать новые stat points;
- новые игроки больше не стартуют с fresh stat points;
- legacy stat-allocation удалена из runtime и persistence-контрактов полностью;
- новая ось роста начинает идти через `PlayerSchoolMastery`, чтобы школа усиливала именно стиль боя, а не только голые числа.
- для locked slice первые same-school synergies у Пламени и Тверди живут прямо в battle-domain rules и используют уже существующее состояние боя (`cooldown`, `guard`, `hp threshold`), а не отдельный новый runtime layer.
- support-slot открывается через mastery milestone и пока даёт только половину статов выбранной руны; это первый loadout breadth slice без второй active action семантики.
- support-slot v2 добавляет bounded passive modifier layer для locked школ, но current one-active combat budget остаётся временным readability rule, а не permanent ban на future multi-skill expansion.

### 8. Release discipline

`src/tooling/release/versioning.ts` фиксирует правило: каждые `100` коммитов дают новую пользовательскую версию формата `M.nn`.

- `npm run content:validate` валидирует контент и баланс до сборки;
- `npm run release:status` показывает текущее состояние версии;
- `npm run release:summary` собирает пользовательское release summary из недокументированных коммитов;
- `npm run release:evidence` собирает unified markdown-отчёт по runtime evidence для onboarding coverage, school payoff, next-goal/return clarity и QA/exploit guardrails за ограниченное временное окно (последние 7 дней по умолчанию);
- `npm run release:preflight` проверяет, что релизные документы в корне проекта существуют и не пустые;
- `RELEASE_CHECKLIST.md` задаёт единый локальный релизный процесс;
- `.github/workflows/ci.yml` повторяет тот же минимальный пайплайн в CI.

### 8.5. Mutation safety rails

`PrismaGameRepository` дополнительно страхует release-кандидат от типичных chat/game race-сценариев:

- повторная финализация одного и того же боя больше не должна повторно начислять опыт, пыль, осколки и руну;
- расход осколков идёт через guarded `updateMany`, поэтому инвентарь не должен уходить в отрицательные значения;
- уничтожение руны и возврат осколков выполняются атомарно, чтобы повторный `сломать` не дублировал награду;
- создание нового боя повторно использует уже активную сессию, если она ещё не завершена.
- победная награда теперь получает отдельный versioned `RewardIntent` и сохраняется в `RewardLedgerRecord`, чтобы повторный retry возвращал canonical battle result вместо повторного reroll.
- stale active-battle mutation логируется как `battle_stale_action_rejected`, а critical concurrency cases зафиксированы в `docs/testing/concurrency-critical-use-cases.md`.
- battle persistence versioning и checked-in fixtures теперь описаны отдельно в `docs/platform/persistence-versioning-rules.md`, чтобы rollback/fallback policy не оставалась “в коде по умолчанию”.
- player-state hydration теперь тоже вынесена в один compatibility-safe helper [`src/modules/shared/infrastructure/prisma/player-state-hydration.ts`](src/modules/shared/infrastructure/prisma/player-state-hydration.ts), чтобы `Player`, `PlayerProgress`, `PlayerInventory`, `Rune` и `PlayerSchoolMastery` не склеивались в runtime через разрозненные fallback'и.

### 8.6. Telemetry semantics

Shipped telemetry v1 не вводит отдельную analytics-platform и опирается на существующий `GameLog` rail через typed adapter [`RepositoryGameTelemetry`](src/modules/shared/infrastructure/telemetry/RepositoryGameTelemetry.ts:1).

- application-owned события вроде `onboarding_started`, `tutorial_path_chosen`, `first_school_committed` и `loadout_changed` пишутся после committed mutation/use-case transition;
- transport-owned shown-screen события вроде `first_school_presented`, `return_recap_shown` и `post_session_next_goal_shown` пишутся только после реально отправленного экрана;
- screen telemetry использует тот же canonical `next-goal` read-model, что и player-facing copy, чтобы telemetry и UX не расходились по смыслу.
- release evidence для текущего vertical slice собирается отдельным tooling-командой [`npm run release:evidence`](README.md), которая читает только ограниченный набор stable telemetry events и не превращает preflight в live-analytics зависимость.

### 9. Smoke verification

`src/vk/handlers/gameHandler.smoke.test.ts` проверяет transport-уровень через [`GameHandler.handle()`](src/vk/handlers/gameHandler.ts:41), а не через реальные VK updates.

Это даёт быстрый регрессионный контроль для сценариев:

- регистрация игрока;
- вход в обучение и старт боя;
- завершение боя;
- руны и алтарь;
- пропуск обучения.

Такой уровень проверки остаётся воспроизводимым в CI и не требует реального доступа к VK API.

### 10. Documentation discipline

Изменения пользовательского поведения должны синхронно обновлять:

- `README.md`
- `CHANGELOG.md`
- `PLAN.md`
- `RELEASE_CHECKLIST.md`
- `ARCHITECTURE.md` при изменении архитектурных границ

## Как безопасно добавлять новую систему

1. Сначала определить доменные сущности и чистые функции.
2. Затем оформить use-case в `application`.
3. Протянуть зависимости через `composition-root`.
4. При необходимости добавить transport-команды в `src/vk/commands/catalog.ts`.
5. Обновить клавиатуры, presenter и handler.
6. Добавить или расширить unit tests для чистой логики.
7. Обновить `CHANGELOG.md`, `README.md`, `PLAN.md`, `RELEASE_CHECKLIST.md` и при необходимости `ARCHITECTURE.md`.

## Инварианты проекта

- derived stat'ы считаются в домене, а не хранятся дублирующимся слоем в БД;
- battle state хранится как snapshot и восстанавливается через repository mapper;
- игрок не настраивает уровень локации вручную, это делает доменная логика сложности;
- контентные сиды и баланс должны проходить автоматическую валидацию до seed, check и release preflight;
- транспорт не должен возвращать ручные команды управления уровнем угрозы;
- keyboard-first сценарий является основным транспортным сценарием для VK;
- VK transport не должен напрямую содержать игровую логику;
- rune hub не должен требовать новой persistence-модели: page navigation и slot selection работают поверх уже существующего `currentRuneIndex`;
- battle state должен оставаться самодостаточным: если рунное действие уже вошло в бой, его mana/cooldown/guard не должны зависеть от внешнего VK/UI состояния;
- telegraphed enemy behavior тоже должен жить в battle snapshot, а не в ephemeral UI-состоянии;
- повторные команды не должны дублировать боевые награды, возврат осколков и создание активного боя;
- инвентарь не должен уходить в отрицательные значения даже при повторных или запоздавших входящих командах;
- новые функции должны добавляться через маленькие use-case'ы, а не через один разрастающийся handler;
- все новые внешние правила должны иметь одно место правды: каталог команд, config balance, release formula или repository port.

## Следующие точки роста

- активные и пассивные навыки рун;
- дополнительные боевые действия помимо базовой атаки;
- крафт и предметы поверх текущего инвентаря;
- сезонные ивенты, квесты и PvP;
- отдельный слой application DTO при росте числа transport-контрактов.
