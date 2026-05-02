# Runemasters Return

Текущий economic slice добавляет `✨ Сияние` как вторую игровую валюту: она фармится мягким `Следом дня`, хранится в `Player.radiance`, видна в меню/профиле/инвентаре и уже проходит через reward/telemetry/evidence контракты без отдельной таблицы.

Runemasters Return — VK MMO RPG на TypeScript с модульным игровым движком, интро-обучением и умной динамической сложностью.

## Что уже есть

- модульный backend с разделением на `application`, `domain`, `infrastructure` и `transport`;
- игровая петля: регистрация, интро-обучение, профиль, прокачка, исследование, бой, руны и алтарь;
- Prisma-схема для изменяемого runtime state в SQLite, а статический world/rune content живёт в коде;
- централизованный каталог VK-команд и единый builder клавиатур;
- защита от дублирования наград, отрицательных остатков инвентаря и повторного создания активных боёв;
- более ясные сообщения onboarding/боя с явным следующим шагом для игрока;
- единый paged rune hub: до 5 рун на странице, явное состояние `выбрана / надета` и отдельный `🕯 Алтарь` для создания, экипировки, перековки и распыления выбранного знака;
- экономика рун имеет ранние траты: создание расходует осколки и пыль, UNUSUAL+ крафт требует материалы вроде эссенции, а перековка служит понятным sink'ом для пыли и лишних осколков;
- Мастерская умеет алхимию пилюль из трофейной добычи: кожа, кость, металл, трава и эссенция превращаются в расходники восстановления здоровья, маны и короткой боевой защиты без постоянного роста статов;
- `📜 Книга путей` с каруселью записей по 5: готовые награды идут первыми, один ближайший след держит направление, закрытые записи уходят в компактный архив, claim остаётся exact-once через reward ledger;
- `📖 Бестиарий` с каруселью локаций по 5: враги раскрываются после первой встречи вместе с повадкой и рабочим ответом, а их добыча и шанс руны — после первого обработанного трофея;
- `✨ След дня` как мягкая optional активность: один календарный след даёт небольшую награду через существующий reward ledger, повтор за день безопасно возвращает уже найденный след без streak, штрафов и FOMO;
- мини-ветка mastery milestones: 4 ранние видимые вехи школы на `1/3/5/7` опыта открываются текущими победами с надетой школьной руной и показываются в профиле/рунах без большого дерева навыков;
- event-first экран боя: компактный HUD, отдельные HP/mana/stat блоки участников, читаемые последние события и явный CTA после результата;
- исследование теперь может завершиться отдельной non-combat сценой без создания боя: передышкой, находкой маршрута, следом Мастера испытаний или школьной подсказкой без FOMO;
- если исследование приводит к бою, игрок сначала видит встречу с врагом и выбирает `⚔️ В бой` или `💨 Отступить`, а не мгновенно падает в первый ход;
- встречи стали разнообразнее без новых биомов: засады, свежие следы, усталые враги и элитные следы меняют инициативу, шанс ухода и стартовое состояние врага, а безопасная находка добавляет спокойный non-combat исход;
- HP и мана теперь сохраняются между боями через `PlayerProgress`: следующая встреча стартует с состоянием после прошлой схватки, а поражение поднимает игрока до безопасного floor восстановления;
- anti-stall rails мягко выводят из тупика: при низком HP next-goal ведёт в `🌿 Передышку` с восстановлением, а после серии поражений маршрут предлагает проверить руны или даёт облегчённую встречу без тяжёлых целей;
- post-defeat экран объясняет последствия без штрафной экономики: победная добыча не начислена, руны/пыль/материалы/школа сохранены, HP/мана восстановлены, а маршрут ведёт через `🔮 Руны` к `⚔️ Осторожно дальше`;
- в exploration появились бродячие встречи: мобы из ближайшего старого биома иногда заходят выше по уровню, а мобы из ближайшего более опасного биома могут очень редко появиться снизу только после раннего safe-порога;
- выровненный ранний баланс: новые персонажи стартуют сильнее, первые мобы ослаблены, а случайные high-rarity rune drops на низких уровнях ограничены;
- первый playable rune combat slice: экипированная руна может давать реальное активное боевое действие с маной и откатом;
- боевые навыки начали расти от фактов хода, а не от текста журнала: результативная атака ведёт `combat.striking`, защита ведёт `combat.guard`, активная руна ведёт `rune.active_use`;
- мана в бою медленно восстанавливается при возврате хода игроку, поэтому рунные действия остаются ресурсным выбором, а не одноразовой кнопкой до конца боя;
- первый tactics layer: у игрока есть универсальная `защита`, а часть врагов телеграфирует тяжёлый удар заранее;
- следующий tactics layer: часть врагов телеграфирует guard-break, который делает слепую `защиту` плохим ответом;
- combat choice v1 делает intent практичным выбором: тяжёлый удар усиливает ценность `защиты`, guard-break подталкивает к атаке или готовой руне, а рунное действие получает небольшой бонус по раскрытому замыслу врага;
- активные руны в бою показывают читаемую доступность: стоимость маны, текущий откат, нехватку маны и состояние `не тот момент` на экране и в кнопках;
- player-facing слой уже говорит про **школы рун**, а не про внутренние `архетипы`;
- canonical `SchoolDefinition` теперь держит player-facing identity школ в одном content-контракте вместо отдельной hand-written presentation map;
- onboarding теперь явно объясняет ранний путь игрока как `базовая атака -> первая руна -> школа рун -> стиль боя` без внутреннего жаргона;
- завершённый бой теперь всегда заканчивается явной `Следующей целью`, а не только голым CTA на кнопку;
- existing-player `start`, `пропустить обучение` и `в приключения` теперь дают краткий return recap без guilt/FOMO copy;
- `main menu`, `return recap`, `rune hub` и `battle result` теперь используют общий школьный next-goal read-model: игрок видит ближайшую school-веху или ближайший loadout payoff, а не четыре разных подсказки;
- rune hub теперь показывает ближайшую mastery-веху и то, что она даст школе, а battle result больше не расходится с актуальным return/context состоянием игрока;
- battle result и крафт руны теперь могут показывать короткий `Что изменилось?` recap: игроку сразу объясняется, что дала новая руна, новая редкость или unlock сборки и что стоит попробовать следующим шагом;
- `Книга путей` теперь открывает квестовые главы каруселью по 5 записей: страницы сохраняют группировку по главам/школам, готовые награды помечены `🎁 Награда не собрана`; claim идёт через exact-once `RewardLedgerRecord`, а legacy text `забрать награду` получает canonical replay receipt;
- post-battle trophy progression теперь поддерживает малые action-based срезы: базовый сбор добычи, threshold-действия для свежевания/реагентов/эссенции, второй мини-порог качества для свежевания/сбора слизи, enemy-kind действия и первые school-specific hidden trophy actions для четырёх стартовых школ через тот же pending reward rail;
- стартовые школы получают реальную боевую идентичность: Пламя давит guard-break и дожимает, Твердь держит тяжёлые телеграфы, Буря темпует через `Шаг шквала`, а Прорицание называет прочитанный intent;
- школа Тверди уже получила первый полный пакет: пассивную защитную идентичность и активный `Каменный отпор`;
- tutorial loop теперь подводит игрока к первой активной руне, экипировке и первому применению рунного действия;
- новые уровни больше не раздают новые stat points как основной рост; основная ось прогрессии теперь идёт через school mastery;
- school mastery v0 теперь растёт за победы с экипированной школой и даёт первый non-flat боевой payoff вместо очередного голого +к статам;
- два слота рун теперь доступны с начала: каждая надетая руна даёт полные статы, пассивы и свою активную боевую кнопку, если у руны есть active skill;
- будущие дополнительные слоты должны открываться через уровни, очки и ветку прокачки, а не через модель “поддержки”;
- для locked Vertical Slice у Пламени и Тверди уже зафиксированы первые same-school starter synergies: школа начинает давать читаемую связку `setup -> payoff`, а не только отдельный пассивный бонус;
- ранний `dark-forest` теперь получил school-specific elite hooks для Пламени и Тверди: Пепельная ведунья подталкивает к давлению и дожиму, а Камнерогий таран — к чтению тяжёлого удара и защитному ответу;
- school-aligned elite rewards теперь могут гарантировать первую `необычную` руну своей школы, если игрок ещё не вышел в эту school-веху сам; это делает chase более намеренным и меньше похожим на случайное казино;
- школьный next-goal теперь умеет вести новичка по короткому `school novice path`: сначала к первому испытанию школы в `dark-forest`, затем к первой `необычной` руне своей школы;
- evidence layer для early school loop начал собираться прямо в runtime: логируется старт school novice elite encounter, а `reward_claim_applied` теперь различает aligned novice reward вместо безликого общего reward event;
- первая aligned `unusual` руна школы теперь подаётся как завершение `первого испытания школы`, а не как безымянный дроп: battle result и ключевые экраны закрепляют статус игрока как уже признанного ученика Пламени/Тверди;
- если первый знак школы уже получен, но ещё не надет, next-goal теперь ведёт не в абстрактный гринд, а прямо в `🔮 Руны`, фокусирует этот знак и помогает закрепить признание школы в реальной сборке;
- evidence layer теперь также ловит осмысленные follow-up шаги после school trial: открытие рун, установку первого знака школы и старт следующего боя после признания школы;
- после установки первого знака школы rune hub теперь даёт короткий payoff recap: что изменилось в стиле боя и что стоит попробовать уже в следующем бою;
- после установки первого знака школа ведёт дальше обычным действием `⚔️ Исследовать`, а школьная проверка проходит внутри общего exploration resolver без отдельного обязательного режима;
- после установки первого знака школы `dark-forest` теперь может подбросить school-aligned miniboss continuation: Пепельную матрону для Пламени и Гранитного стража для Тверди, с первым targeted `RARE` payoff этой школы;
- после первого school miniboss rare-награда больше не выглядит как просто ещё один дроп: recognition/read-model слой поднимает её в `печать школы`, а next-goal ведёт либо к её экипировке, либо дальше в mastery path;
- после экипировки rare-печати открывается новый горизонт `Цель печати`: печать даёт маленький school-specific боевой бонус и ведёт к mastery rank 2 без новых школ или таблиц;
- release evidence теперь видит полный ранний school loop до первой печати: `novice elite -> UNUSUAL знак -> rune hub/equip -> school miniboss -> RARE seal` по Пламени, Тверди, Бури и Прорицанию;
- payload-кнопка `надеть`, если кладёт школьный знак во второй свободный слот, всё равно даёт compact payoff recap и telemetry `equip_school_sign`, потому что этот знак уже считается реальной частью сборки;
- `Прорицание` получило свой первый узкий school-first proof без нового движка: novice elite `Слепой авгур`, первая `UNUSUAL` руна школы и guidance loop вокруг чтения раскрытой угрозы;
- `Буря` теперь тоже доведена до первого полного раннего пути: `Шквальная рысь -> первый знак школы -> Владыка шквала -> первая rare-печать`, без отдельной tempo/initiative системы;
- `Прорицание` теперь тоже доведено до полного раннего пути: `Слепой авгур -> первый знак школы -> Хранитель предзнамений -> первая rare-печать`, без новой боевой системы поверх уже существующих enemy intent rails;
- versioned platform contracts для боевой рунной сборки и reward claims: `LoadoutSnapshot`, `RewardIntent`, `RewardLedger`;
- player-state hydration теперь тоже проходит через compatibility-safe слой с current / legacy / future fixtures, так что persisted player state меньше зависит от ad-hoc fallback'ов при реэнтри и rollback-сценариях;
- active battle теперь даёт короткий `combat clarity` блок: компактное состояние боя и школьный tactical hint, чтобы игрок понимал не только цифры, но и следующий осмысленный ответ прямо на своём ходу;
- если в основе уже стоит первый знак школы, battle clarity сильнее подсказывает именно первый school payoff: что нажать и какой tactical ask проверить в ближайшем бою;
- exact-once reward ledger и canonical battle finalization защищают победную награду от replay/reroll по повторным входящим событиям;
- battle mutation revision защищает активный бой от stale overwrite при спаме и transport retry;
- versioned `BattleSnapshot` и checked-in compatibility fixtures страхуют save/load battle state перед будущими миграциями;
- типобезопасные утилиты сериализации и commit-based релизная политика.

## Школы и архетипы

- **Школа** — это магический путь и большая fantasy-ось прогрессии;
- **архетип** — это боевой стиль внутри школы;
- стартовая раскладка v1:
  - **Школа Пламени** → **Штурм**
  - **Школа Тверди** → **Страж**
  - **Школа Бури** → **Налётчик**
  - **Школа Прорицания** → **Провидец**

## Рельсы проекта

- `src/vk/commands/catalog.ts` — единый источник правды для команд, алиасов и динамических действий;
- `src/vk/keyboards/*` — сценарные VK-клавиатуры (`main`, `battle`, `runes`, `rewards`, `quests`, `bestiary`, `tutorial`) с общим builder'ом и совместимым barrel `index.ts`;
- `src/vk/presenters/*` — player-facing тексты: общий barrel `messages.ts`, сценарные presenters для trophy/quest/bestiary/rune/battle/home/profile/exploration flow и общие чистые formatter'ы для повторяемых строк, прогресса школ и навыков;
- `src/vk/handlers/gameCommandRoutes.ts`, `src/vk/handlers/routes/*` и `src/vk/handlers/gameCommandRecovery.ts` — агрегатор маршрутов, сценарные command routes и recoverable stale/retry контексты отдельно от `GameHandler`;
- `src/vk/handlers/responders/*` — сценарные reply-flow, которые собирают presenter + keyboard для home/profile/location, рун, quest book, bestiary, pending trophy rewards, battle result и exploration result без раздувания `GameHandler`;
- `src/vk/handlers/gameHandlerTelemetry.ts` — transport-level telemetry composer для return recap, school presentation и post-session next-goal событий без смешивания analytics payload'ов с маршрутизацией;
- `src/content/validation/validate-game-content.ts` — автоматическая проверка file-first биомов, мобов, рунного контента и игрового баланса перед быстрыми обновлениями;
- `src/content/runes/schools.ts` — canonical school identity seed, из которого выводится player-facing school presentation;
- `src/modules/shared/application/require-player.ts` — единая точка загрузки игрока и консистентных ошибок для use-case слоя;
- `src/modules/shared/domain/contracts/*` — versioned контракты persistence-уровня для боевой сборки, reward claim flow и quest reward ledger snapshot;
- `src/shared/utils/json.ts` — единая точка для JSON clone/parse/stringify;
- `docs/platform/retry-handling-rules.md`, `docs/platform/persistence-versioning-rules.md`, `docs/qa/reward-duplication-matrix.md`, `docs/testing/concurrency-critical-use-cases.md` — зафиксированные retry/concurrency rails и versioning policy для critical battle/reward flows;
- `docs/platform/rng-authority-rules.md` — граница server-authoritative randomness для craft / reroll / reward drops;
- `docs/platform/command-intent-rules.md` — intent-based replay policy для guarded mutation families: рун, обучения, исследования, боя, удаления персонажа и legacy text claim наград `Книги путей`;
- `docs/product/lore-quests-home-continuation.md` — source-of-truth по `Книге путей`, quest reward copy, exact-once claim rail и границе до отдельного `PlayerQuestState`;
- `docs/product/1-0-release-charter.md` — утверждённое обещание релиза 1.0, explicit out-of-scope и ethical retention red lines;
- `docs/product/school-bible-v1.md` — product lock по четырём стартовым школам: identity, tactical ask, allowed/forbidden overlap и safe hidden trophy directions;
- `docs/product/action-based-progression-and-trophy-loot.md` — дизайн pending trophy rewards, action-based навыков, скрытого дропа от школ/рун/ролей и узких специализаций;
- `docs/reviews/phase-1-exit-gate.md` — исторический gate-review для перехода из Foundation & Platform к Vertical Slice scope lock; текущая релизная готовность живёт в `PLAN.md`, `RELEASE_CHECKLIST.md` и evidence-отчётах;
- `docs/reviews/progression-rework-v1.md` — решение по уходу от новых stat points за уровни к school mastery как следующей оси роста;
- `docs/reviews/starter-synergy-v1.md` — исторический первый same-school synergy slice для Пламени и Тверди; актуальная идентичность четырёх школ закреплена в `docs/product/school-bible-v1.md` и runtime-тестах;
- `docs/reviews/rune-hub-ux-v1.md` — актуальный rune hub baseline: список по 5 рун, отдельная карточка выбранной руны и два равноправных стартовых слота;
- `docs/reviews/support-rune-slot-v1.md` и `docs/reviews/support-rune-slot-v2.md` — superseded-ссылки старой модели второго слота, оставленные только для исторических changelog-ссылок;
- `docs/telemetry/telemetry-plan.md` — минимальный telemetry v1 план для onboarding clarity, school readability, return UX, economy health и exploit review;
- `docs/testing/release-evidence-report.md` — локально сгенерированный markdown-отчёт для release evidence pass по onboarding coverage, school payoff, next-goal/return clarity и QA/exploit signals;
- `src/modules/player/application/read-models/next-goal.ts` — canonical read-model ближайшей school-вехи и next-step guidance для `main menu`, `return recap`, `rune hub` и `battle result`;
- `src/modules/quests/application/read-models/quest-book.ts` — read-model `Книги путей`, который выводит прогресс и готовность наград из `PlayerState`, content definitions и `RewardLedgerRecord`;
- `src/modules/world/domain/bestiary.ts` и `src/modules/world/application/use-cases/GetBestiary.ts` — read-model бестиария поверх file-first world catalog, `BattleSession` и `RewardLedgerRecord` без отдельной таблицы прогресса;
- `src/modules/shared/infrastructure/telemetry/RepositoryGameTelemetry.ts` — typed telemetry adapter над `GameLog` для `onboarding_started`, `tutorial_path_chosen`, `first_school_presented`, `first_school_committed`, `loadout_changed`, `school_novice_elite_encounter_started`, `school_novice_follow_up_action_taken`, `return_recap_shown`, `post_session_next_goal_shown`;
- `src/modules/shared/infrastructure/prisma/player-state-hydration.ts` — compatibility-safe hydration layer для persisted player state с current / legacy / future fixtures;
- `src/modules/shared/infrastructure/prisma/prisma-game-mappers.ts` — чистые Prisma → runtime мапперы для player/battle records, отделённые от транзакционной логики `PrismaGameRepository`;
- `docs/content/content-pipeline-plan.md`, `docs/content/validator-scope.md`, `docs/content/templates/school-package-template.md` — source-of-truth по content packages, validator tiers и school package completeness;
- `docs/testing/school-path-playtest-v1.md` — ручной playtest/evidence pass для school-first vertical slice по Пламени, Тверди, Бури и Прорицанию;
- `npm run release:school-evidence` — узкий markdown-отчёт по school-first telemetry funnel из `GameLog` для ручного school-path pass;
- `npm run release:evidence` — unified release evidence report из `GameLog` за последние 7 дней по умолчанию; собирает school payoff, onboarding coverage, next-goal/return clarity и QA/exploit signals в одном markdown-срезе и пишет локальный `docs/testing/release-evidence-report.md`;
- `npm run release:local-playtest` — локальный first-session smoke через реальный `GameHandler` и SQLite: legacy text и keyboard payload проходят старт, обучение, бой, первую руну, экипировку и профиль без VK API;
- `npm run release:gate` — полный локальный gate 1.0: Prisma generate/deploy, check, playtest, school evidence, release evidence, preflight и проверка релизных документов;
- `src/modules/runes/domain/rune-collection.ts` — paging helper'ы рунной коллекции поверх существующего `currentRuneIndex` без новой persistence-схемы;
- `src/tooling/release` — правила версионирования, content validation, unified evidence/preflight-проверка и скрипты `npm run content:validate` / `npm run release:status` / `npm run release:evidence` / `npm run release:preflight` / `npm run release:gate`;
- `src/vk/handlers/gameHandler.smoke.test.ts` — smoke-проверки пользовательских сценариев через transport orchestration без реального VK API;
- `src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts` — регрессионные тесты на idempotency, underflow-защиту инвентаря и защиту от дублирования боевых/рунных мутаций;
- `src/modules/combat/domain/battle-engine.test.ts`, `src/modules/world/domain/enemy-scaling.test.ts`, `src/modules/runes/domain/rune-collection.test.ts`, `src/modules/runes/domain/rune-factory.test.ts` — тесты на боевые рельсы, инициативу, paging рун и rarity caps;
- `npm run check` — быстрый прогон typecheck + tests + build перед изменениями и коммитом.

## Технологии

- TypeScript
- Prisma ORM
- SQLite
- vk-io
- tsx
- Vitest

## Структура проекта

```text
bot-vk-game-mmo-rpg-runemasters-return/
├── .github/
│   └── workflows/
│       └── ci.yml
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   ├── config/
│   ├── database/
│   ├── modules/
│   │   ├── combat/
│   │   ├── exploration/
│   │   ├── player/
│   │   ├── runes/
│   │   ├── shared/
│   │   └── world/
│   ├── shared/
│   │   ├── domain/
│   │   ├── types/
│   │   └── utils/
│   ├── tooling/
│   │   └── release/
│   ├── vk/
│   │   ├── commands/
│   │   ├── handlers/
│   │   ├── keyboards/
│   │   ├── presenters/
│   │   └── router/
│   └── index.ts
├── ARCHITECTURE.md
├── CHANGELOG.md
├── PLAN.md
├── RELEASE_CHECKLIST.md
├── QUICKSTART.md
└── package.json
```

Подробная архитектурная карта лежит в `ARCHITECTURE.md`, текущий план масштабирования — в `PLAN.md`, а единый релизный чек-лист — в `RELEASE_CHECKLIST.md`.

## Установка

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run check
```

`npm run db:seed` больше не заливает мобов и биомы в SQLite: команда валидирует file-first контент и подтверждает, что база нужна только для изменяемого runtime state.

Если в рабочей папке уже есть старая база и её нужно принудительно заменить:

```bash
npm run db:push -- --accept-data-loss
npm run db:seed
npm run check
```

## Настройка окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```env
VK_TOKEN=your_vk_group_token_here
# Optional. Если пусто, бот сам определит id группы через VK API.
VK_GROUP_ID=
DATABASE_URL="file:./dev.db"
GAME_STARTING_LEVEL=1
GAME_STARTING_USUAL_SHARDS=25
GAME_STARTING_UNUSUAL_SHARDS=10
GAME_STARTING_RARE_SHARDS=3
```

## Команды разработки

```bash
npm run dev
npm run build
npm run typecheck
npm run content:validate
npm run test
npm run check
npm run release:status
npm run release:summary
npm run release:local-playtest
npm run release:school-evidence
npm run release:evidence
npm run release:preflight
npm run release:gate
npm run db:generate
npm run db:deploy
npm run db:push
npm run db:seed
npm run db:studio
```

## Игровые команды

### Главное меню

- `начать` — создать персонажа или войти в существующего;
- `удалить персонажа` — удалить текущего героя и начать заново без ручной чистки базы;
- `профиль` — открыть профиль героя, школы рун и текущего боевого роста;
- `инвентарь` — посмотреть осколки и материалы;
- `след дня` / `мягкий след` / `тихий след` — забрать optional мягкий след дня; повтор в тот же календарный день не начисляет вторую награду;
- `локация` / `обучение` — перейти в нулевой интро-биом;
- `пропустить обучение` — сразу выйти в основной мир;
- `в приключения` — вернуться из обучения в основной мир;
- `назад` — вернуться в главное меню.

### Книга путей

- `книга путей` / `квесты` / `задания` / `летопись пути` — открыть главы пути каруселью по 5 записей: готовые награды, ближайший след, остальные следы и компактный архив;
- `забрать награду` — забрать текущую готовую награду; повтор того же legacy text intent возвращает canonical result и не выбирает следующую готовую запись.

### Исследование и бой

- `исследовать`
- `в бой` — принять предложенную встречу и начать бой;
- `отступить` — попытаться уйти из предложенной встречи с шансом от ловкости;
- `атака`
- `защита`
- `навыки` / `спелл` — legacy-команды для активного действия слота 1;
- `навык 1`, `навык 2` — запускают активное действие соответствующего слота, если у руны есть боевой навык и хватает маны;

Текущий срез — это **первый playable multi-rune combat slice**: в бою работают две стартовые руны, их полные статы, пассивы и активные кнопки. Passive-only руны остаются полезными через пассивы и статы, мана понемногу возвращается при смене хода обратно к игроку, а текущие HP/мана переносятся в следующую встречу. Legacy-тексты `бой`, `начать бой`, `сражаться`, `бежать` и `отступление` сохраняются как алиасы для фазы встречи.

Enemy intent теперь не просто предупреждает об опасности, а меняет качество ответа: раскрытый тяжёлый удар подсвечивает и усиливает `защиту`, guard-break предупреждает не уходить в чистую стойку, а готовая активная руна получает маленькое окно точного удара по раскрытому замыслу.

Ручной выбор уровня локации больше не используется. Теперь игра сама подбирает сложность на основе:

- уровня персонажа;
- реальной боевой силы от статов и экипированных рун;
- серии побед подряд;
- серии поражений подряд, чтобы после неудач снова приходили мобы по зубам.

Чтобы динамическая сложность не стирала старых врагов из игры, encounter resolver иногда подмешивает мобов из ближайшего нижнего биома (`10%`) и очень редко — из ближайшего верхнего биома (`2%`, только с уровня угрозы `10`). Боссы так не кочуют. После поражения ближайший explore не форсит school elite/miniboss и не тянет верхний roaming, чтобы путь восстановления не превращался в повтор той же стены.

Исторические команды ручного изменения уровня угрозы (`+ур`, `-ур` и их расширенные варианты) больше не поддерживаются, чтобы у сложности оставалось одно место правды.

### Руны и алтарь

- `руна` / `алтарь` — открывают единый rune hub для просмотра, экипировки, создания, перековки и распыления;
- `+руна`, `-руна`, `>>руна`, `<<руна`
- `надеть`, `надеть слот 1`, `надеть слот 2`, `снять`
- `создать`
- `изменить руну`
- `сломать`
- `руна слот 1`, `руна слот 2`, `руна слот 3`, `руна слот 4`, `руна слот 5`
- `~атк`, `~здр`, `~фзащ`, `~мзащ`, `~лвк`, `~инт`

## Процесс развития проекта

1. Добавьте или измените команду в `src/vk/commands/catalog.ts`, если меняется transport-слой.
2. Проверьте, не нарушает ли изменение контентные инварианты в `src/content/*` и `src/config/game-balance.ts`.
3. Реализуйте чистую доменную логику в `src/modules/*/domain`.
4. Подключите use-case в `src/modules/*/application` и протащите его в `src/app/composition-root.ts`.
5. Обновите `README.md`, `CHANGELOG.md`, `PLAN.md`, `RELEASE_CHECKLIST.md` и при необходимости `ARCHITECTURE.md`.
6. Перед коммитом прогоните `npm run check`.
7. Для release evidence pass прогоните `npm run release:evidence` и приложите отчёт к manual review.
8. Перед быстрой выкладкой прогоните `npm run release:preflight`.

## Обучение и динамическая сложность

- новые игроки начинают в `нулевом биоме` — это безопасная интро-зона;
- обучение можно пропустить и позже снова открыть из меню;
- после победы в интро игрок автоматически выходит в основной мир;
- если в базе остался «битый» активный бой с уже мёртвым игроком или врагом, он автоматически завершается при следующем обращении к бою;
- после поражений сложность адаптивно снижается, HP/мана восстанавливаются до безопасного floor, а экран результата ведёт через руны к осторожной следующей встрече;
- после серии побед сложность постепенно растёт сама, без ручных `+ур` и `-ур`.
- повторные клики по бою и рунным операциям не должны дублировать награды или уводить осколки в минус.
- новые персонажи и первые враги выровнены так, чтобы ранний бой был читаемым и не ощущался как guaranteed loss;
- случайные выпавшие руны на ранних уровнях ограничены по максимальной редкости, чтобы low-level прогресс не ломался lucky jackpot'ом.
- первая победа в обучении гарантированно ведёт к первой активной руне и следующей цели: надеть её и применить в бою.
- часть врагов теперь заранее показывает, что готовит тяжёлый удар: это прямой сигнал использовать `защиту` или рунное действие с хорошим таймингом.
- часть врагов заранее показывает, что готовит пробивающий удар: в этот ход лучше давить уроном, а не полагаться на слепую защиту.
- боевой экран и клавиатура теперь показывают строку `🎲 Выбор`: когда лучше защищаться, когда давить атакой и когда готовая руна получает окно по раскрытому намерению врага.
- базовая атака уже начинает вести себя по-разному в зависимости от школы: одни школы давят стабильно, другие выигрывают от чтения телеграфов.
- школа Тверди теперь играет не только через пассивную стойкость: `Каменный отпор` позволяет ответить уроном и защитой в одном ходе.

## Keyboard-first интерфейс

- вход в игру, обучение, бой, профиль, инвентарь, `Книга путей`, алтарь, руны и удаление персонажа доступны кнопками;
- часть старых боевых, квестовых и рунных текстовых команд всё ещё распознаётся для совместимости, но основной сценарий рассчитан на клавиатуру VK;
- mutation-capable legacy text для боя, рун, исследования и `забрать награду` получает server-owned intent, чтобы retry транспорта возвращал canonical result вместо второго применения;
- экраны приветствия, обучения, рун и боя подсказывают следующий шаг прямо в сообщении;
- рунный экран показывает до 5 рун на странице, явно разводит `выбрана / надета` и позволяет быстро выбирать нужную руну по слотам вместо бесконечного next/prev browsing;
- rune hub показывает карусель по 5 рун, статус `выбрана / надета N`, а действия `надеть / снять / распылить` появляются только после выбора конкретной руны;
- два стартовых слота рун равноправны: обе руны активируются полностью, без player-facing роли “поддержки”;
- экран боя показывает ключевое состояние и последние события, а завершённый бой возвращает в общий CTA `⚔️ Исследовать`;
- если руна даёт активное действие, battle keyboard показывает его название, готовность, стоимость маны и откат прямо на кнопке/экране;
- battle screen показывает блок `Доступные действия` и намерение врага, если тот готовит тяжёлый удар;
- battle screen теперь объясняет не только готовность навыка, но и его тактическую роль, а enemy intent может предупреждать как о тяжёлом ударе, так и о guard-break;
- rune screen и battle screen объясняют школу как стиль боя, а не как внутренний `архетип`;
- если персонажа нет, бот показывает стартовую клавиатуру только с кнопкой `начать`.

## Версионирование и changelog

- публичная версия считается по commit-based правилу: каждые 100 коммитов дают новый релиз формата `M.nn`;
- это значит, что `100` коммитов = версия `1.00`, `245` коммитов = версия `2.45`;
- `package.json` хранит техническую npm-версию пакета и не является player-facing версией игры;
- `npm run content:validate` проверяет file-first мир, рунный контент и базовый баланс до сборки и релиза;
- текущий статус можно посмотреть через `npm run release:status`;
- `npm run release:summary` собирает краткое release summary из git-истории относительно последней changelog-записи;
- `npm run release:local-playtest` создаёт синтетических игроков и проверяет first-session route через legacy text и payload-кнопки с актуальными `stateKey`;
- `npm run release:evidence` собирает единый markdown-отчёт по runtime evidence для onboarding coverage, school payoff, return recap, next-goal и QA/exploit rails; по умолчанию берёт окно последних 7 дней и при необходимости поддерживает `--since`, `--until`, `--days`, `--output`; date-only `--since/--until` трактуются как UTC-границы календарного дня;
- перед выкладкой изменений стоит прогонять `npm run release:preflight`, чтобы проверить документацию, релизные рельсы и остановить релиз при пропущенных или пустых обязательных файлах;
- `npm run release:gate` последовательно запускает полный локальный сценарий 1.0 и падает при blocker findings, незаписанных manual decisions, красных дырах в документах или критических content ошибках;
- `.github/workflows/ci.yml` повторяет минимальный релизный пайплайн в CI;
- локальный и CI-процесс зафиксирован в `RELEASE_CHECKLIST.md`;
- пользовательские изменения фиксируются в `CHANGELOG.md`.

## Smoke-проверки

- ключевые пользовательские сценарии `старт`, `обучение`, `бой`, `руны` и `пропуск обучения` покрыты в `src/vk/handlers/gameHandler.smoke.test.ts`;
- smoke-уровень проходит через `GameHandler`, command routing и presenters, поэтому ловит регрессии transport orchestration;
- тесты не требуют реального VK API и не поднимают настоящую VK-сессию, что делает их пригодными для локального прогона и CI.
