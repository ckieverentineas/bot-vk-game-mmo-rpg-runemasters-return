# Runemasters Return

Runemasters Return — VK MMO RPG на TypeScript с модульным игровым движком, интро-обучением и умной динамической сложностью.

## Что уже есть

- модульный backend с разделением на `application`, `domain`, `infrastructure` и `transport`;
- игровая петля: регистрация, интро-обучение, профиль, прокачка, исследование, бой, руны и алтарь;
- Prisma-схема и сиды мира для SQLite;
- централизованный каталог VK-команд и единый builder клавиатур;
- защита от дублирования наград, отрицательных остатков инвентаря и повторного создания активных боёв;
- более ясные сообщения onboarding/боя с явным следующим шагом для игрока;
- единый paged rune hub: до 5 рун на странице, явное состояние `выбрана / надета` и быстрые действия без листания по одной штуке;
- event-first экран боя: компактный HUD, читаемые последние события и явный CTA после результата;
- выровненный ранний баланс: новые персонажи стартуют сильнее, первые мобы ослаблены, а случайные high-rarity rune drops на низких уровнях ограничены;
- первый playable rune combat slice: экипированная руна может давать реальное активное боевое действие с маной и откатом;
- первый tactics layer: у игрока есть универсальная `защита`, а часть врагов телеграфирует тяжёлый удар заранее;
- следующий tactics layer: часть врагов телеграфирует guard-break, который делает слепую `защиту` плохим ответом;
- player-facing слой уже говорит про **школы рун**, а не про внутренние `архетипы`;
- canonical `SchoolDefinition` теперь держит player-facing identity школ в одном content-контракте вместо отдельной hand-written presentation map;
- onboarding теперь явно объясняет ранний путь игрока как `базовая атака -> первая руна -> школа рун -> стиль боя` без внутреннего жаргона;
- завершённый бой теперь всегда заканчивается явной `Следующей целью`, а не только голым CTA на кнопку;
- existing-player `start`, `пропустить обучение` и `в приключения` теперь дают краткий return recap без guilt/FOMO copy;
- `main menu`, `return recap`, `rune hub` и `battle result` теперь используют общий school-aware next-goal read-model: игрок видит ближайшую school-веху или ближайший loadout payoff, а не четыре разных подсказки;
- rune hub теперь показывает ближайшую mastery-веху и то, что она даст школе, а battle result больше не расходится с актуальным return/context состоянием игрока;
- battle result и крафт руны теперь могут показывать короткий `Что изменилось?` recap: игроку сразу объясняется, что дала новая руна, новая редкость или unlock сборки и что стоит попробовать следующим шагом;
- стартовые школы получают реальную боевую идентичность: Пламя усиливает давление, Твердь усиливает защиту, Прорицание лучше отвечает на намерения врага;
- школа Тверди уже получила первый полный пакет: пассивную защитную идентичность и активный `Каменный отпор`;
- tutorial loop теперь подводит игрока к первой активной руне, экипировке и первому применению рунного действия;
- новые уровни больше не раздают новые stat points как основной рост; основная ось прогрессии теперь идёт через school mastery;
- school mastery v0 теперь растёт за победы с экипированной школой и даёт первый non-flat боевой payoff вместо очередного голого +к статам;
- первая mastery-веха теперь открывает support-slot для рун: основа даёт боевую кнопку, поддержка даёт половину статов и расширяет сборку без второй активки;
- support-slot v2 теперь даёт ещё и первый ограниченный passive battle contribution для locked школ, но это всё ещё не второй активный навык;
- для locked Vertical Slice у Пламени и Тверди уже зафиксированы первые same-school starter synergies: школа начинает давать читаемую связку `setup -> payoff`, а не только отдельный пассивный бонус;
- ранний `dark-forest` теперь получил school-specific elite hooks для Пламени и Тверди: Пепельная ведунья подталкивает к давлению и дожиму, а Камнерогий таран — к чтению тяжёлого удара и защитному ответу;
- school-aligned elite rewards теперь могут гарантировать первую `необычную` руну своей школы, если игрок ещё не вышел в эту school-веху сам; это делает chase более намеренным и меньше похожим на случайное казино;
- school-aware next-goal теперь умеет вести новичка по короткому `school novice path`: сначала к первому испытанию школы в `dark-forest`, затем к первой `необычной` руне своей школы;
- evidence layer для early school loop начал собираться прямо в runtime: логируется старт school novice elite encounter, а `reward_claim_applied` теперь различает aligned novice reward вместо безликого общего reward event;
- первая aligned `unusual` руна школы теперь подаётся как завершение `первого испытания школы`, а не как безымянный дроп: battle result и ключевые экраны закрепляют статус игрока как уже признанного ученика Пламени/Тверди;
- если первый знак школы уже получен, но ещё не надет, school-aware next-goal теперь ведёт не в абстрактный гринд, а прямо в `🔮 Руны`, чтобы игрок закрепил признание школы в реальной сборке;
- evidence layer теперь также ловит первый осмысленный шаг после school trial: открытие рун, установку первого знака школы и старт следующего боя после признания школы;
- versioned platform contracts для боевой рунной сборки и reward claims: `LoadoutSnapshot`, `RewardIntent`, `RewardLedger`;
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
- `src/vk/keyboards/index.ts` — общий builder клавиатур, который уменьшает копипасту и упрощает рост меню;
- `src/content/validation/validate-game-content.ts` — автоматическая проверка биомов, мобов, рунного контента и игрового баланса перед быстрыми обновлениями;
- `src/content/runes/schools.ts` — canonical school identity seed, из которого выводится player-facing school presentation;
- `src/modules/shared/application/require-player.ts` — единая точка загрузки игрока и консистентных ошибок для use-case слоя;
- `src/modules/shared/domain/contracts/*` — versioned контракты persistence-уровня для боевой сборки и reward claim flow;
- `src/shared/utils/json.ts` — единая точка для JSON clone/parse/stringify;
- `docs/platform/retry-handling-rules.md`, `docs/platform/persistence-versioning-rules.md`, `docs/qa/reward-duplication-matrix.md`, `docs/testing/concurrency-critical-use-cases.md` — зафиксированные retry/concurrency rails и versioning policy для critical battle/reward flows;
- `docs/platform/rng-authority-rules.md` — граница server-authoritative randomness для craft / reroll / reward drops;
- `docs/platform/command-intent-rules.md` — intent-based replay policy для keyboard rune mutations с достаточным бюджетом;
- `docs/product/1-0-release-charter.md` — утверждённое обещание релиза 1.0, explicit out-of-scope и ethical retention red lines;
- `docs/reviews/phase-1-exit-gate.md` — единый gate-review для перехода из Foundation & Platform к Vertical Slice scope lock;
- `docs/reviews/progression-rework-v1.md` — решение по уходу от новых stat points за уровни к school mastery как следующей оси роста;
- `docs/reviews/starter-synergy-v1.md` — первый locked same-school synergy slice для Пламени и Тверди;
- `docs/reviews/rune-hub-ux-v1.md` — rune hub v1: быстрый выбор 5 рун на странице, single-slot loadout сейчас и future extra slots только после отдельного review;
- `docs/reviews/support-rune-slot-v1.md` — первый runtime slice с support-slot: слот 2 открывается через mastery milestone и даёт только bounded pre-battle breadth;
- `docs/reviews/support-rune-slot-v2.md` — следующий support-slot slice: поддержка начинает влиять на бой пассивно, но future multi-skill остаётся отдельным budget decision;
- `docs/telemetry/telemetry-plan.md` — минимальный telemetry v1 план для onboarding clarity, school readability, return UX, economy health и exploit review;
- `src/modules/player/application/read-models/next-goal.ts` — canonical read-model ближайшей school-вехи и next-step guidance для `main menu`, `return recap`, `rune hub` и `battle result`;
- `src/modules/shared/infrastructure/telemetry/RepositoryGameTelemetry.ts` — typed telemetry adapter над `GameLog` для `onboarding_started`, `loadout_changed`, `return_recap_shown`, `post_session_next_goal_shown`;
- `docs/content/content-pipeline-plan.md`, `docs/content/validator-scope.md`, `docs/content/templates/school-package-template.md` — source-of-truth по content packages, validator tiers и school package completeness;
- `src/modules/runes/domain/rune-collection.ts` — paging helper'ы рунной коллекции поверх существующего `currentRuneIndex` без новой persistence-схемы;
- `src/tooling/release` — правила версионирования, content validation, preflight-проверка и скрипты `npm run content:validate` / `npm run release:status` / `npm run release:preflight`;
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
DATABASE_URL="file:./prisma/dev.db"
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
npm run release:preflight
npm run db:generate
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
- `локация` / `обучение` — перейти в нулевой интро-биом;
- `пропустить обучение` — сразу выйти в основной мир;
- `в приключения` — вернуться из обучения в основной мир;
- `назад` — вернуться в главное меню.

### Исследование и бой

- `исследовать`
- `атака`
- `защита`
- `навыки` / `спелл` — запускают активное действие экипированной руны, если у неё есть боевой навык и хватает маны;

Текущий срез — это **первый playable rune combat slice**: в бою исполняются только уже поддержанные активные способности, а passive-only руны пока продолжают работать как бонусы к статам.

Ручной выбор уровня локации больше не используется. Теперь игра сама подбирает сложность на основе:

- уровня персонажа;
- реальной боевой силы от статов и экипированной руны;
- серии побед подряд;
- серии поражений подряд, чтобы после неудач снова приходили мобы по зубам.

Исторические команды ручного изменения уровня угрозы (`+ур`, `-ур` и их расширенные варианты) больше не поддерживаются, чтобы у сложности оставалось одно место правды.

### Руны и алтарь

- `руна` / `алтарь` — открывают единый rune hub для просмотра, экипировки, создания, перековки и распыления;
- `+руна`, `-руна`, `>>руна`, `<<руна`
- `надеть`, `снять`
- `надеть в поддержку`
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
7. Перед быстрой выкладкой прогоните `npm run release:preflight`.

## Обучение и динамическая сложность

- новые игроки начинают в `нулевом биоме` — это безопасная интро-зона;
- обучение можно пропустить и позже снова открыть из меню;
- после победы в интро игрок автоматически выходит в основной мир;
- если в базе остался «битый» активный бой с уже мёртвым игроком или врагом, он автоматически завершается при следующем обращении к бою;
- после поражений сложность адаптивно снижается, чтобы игра не зажимала игрока в безнадёжных боях;
- после серии побед сложность постепенно растёт сама, без ручных `+ур` и `-ур`.
- повторные клики по бою и рунным операциям не должны дублировать награды или уводить осколки в минус.
- новые персонажи и первые враги выровнены так, чтобы ранний бой был читаемым и не ощущался как guaranteed loss;
- случайные выпавшие руны на ранних уровнях ограничены по максимальной редкости, чтобы low-level прогресс не ломался lucky jackpot'ом.
- первая победа в обучении гарантированно ведёт к первой активной руне и следующей цели: надеть её и применить в бою.
- часть врагов теперь заранее показывает, что готовит тяжёлый удар: это прямой сигнал использовать `защиту` или рунное действие с хорошим таймингом.
- часть врагов заранее показывает, что готовит пробивающий удар: в этот ход лучше давить уроном, а не полагаться на слепую защиту.
- базовая атака уже начинает вести себя по-разному в зависимости от школы: одни школы давят стабильно, другие выигрывают от чтения телеграфов.
- школа Тверди теперь играет не только через пассивную стойкость: `Каменный отпор` позволяет ответить уроном и защитой в одном ходе.

## Keyboard-first интерфейс

- вход в игру, обучение, бой, профиль, инвентарь, алтарь, руны и удаление персонажа доступны кнопками;
- часть старых боевых и рунных текстовых команд всё ещё распознаётся для совместимости, но основной сценарий рассчитан на клавиатуру VK;
- экраны приветствия, обучения, рун и боя подсказывают следующий шаг прямо в сообщении;
- рунный экран показывает до 5 рун на странице, явно разводит `выбрана / надета` и позволяет быстро выбирать нужную руну по слотам вместо бесконечного next/prev browsing;
- rune hub теперь отдельно показывает `основу` и `поддержку`: основа даёт единственную активную боевую руну, поддержка расширяет сборку без второй активной кнопки;
- экран боя показывает ключевое состояние и последние события, а завершённый бой сразу предлагает `⚔️ Новый бой`;
- если руна даёт активное действие, battle keyboard показывает его название, готовность, стоимость маны и откат прямо на кнопке/экране;
- battle screen показывает блок `Доступные действия` и намерение врага, если тот готовит тяжёлый удар;
- battle screen теперь объясняет не только готовность навыка, но и его тактическую роль, а enemy intent может предупреждать как о тяжёлом ударе, так и о guard-break;
- rune screen и battle screen объясняют школу как стиль боя, а не как внутренний `архетип`;
- если персонажа нет, бот показывает стартовую клавиатуру только с кнопкой `начать`.

## Версионирование и changelog

- публичная версия считается по commit-based правилу: каждые 100 коммитов дают новый релиз формата `M.nn`;
- это значит, что `100` коммитов = версия `1.00`, `245` коммитов = версия `2.45`;
- `npm run content:validate` проверяет сиды мира, рунный контент и базовый баланс до сборки и релиза;
- текущий статус можно посмотреть через `npm run release:status`;
- `npm run release:summary` собирает краткое release summary из git-истории относительно последней changelog-записи;
- перед выкладкой изменений стоит прогонять `npm run release:preflight`, чтобы проверить документацию, релизные рельсы и остановить релиз при пропущенных или пустых обязательных файлах;
- `.github/workflows/ci.yml` повторяет минимальный релизный пайплайн в CI;
- локальный и CI-процесс зафиксирован в `RELEASE_CHECKLIST.md`;
- пользовательские изменения фиксируются в `CHANGELOG.md`.

## Smoke-проверки

- ключевые пользовательские сценарии `старт`, `обучение`, `бой`, `руны` и `пропуск обучения` покрыты в `src/vk/handlers/gameHandler.smoke.test.ts`;
- smoke-уровень проходит через `GameHandler`, command routing и presenters, поэтому ловит регрессии transport orchestration;
- тесты не требуют реального VK API и не поднимают настоящую VK-сессию, что делает их пригодными для локального прогона и CI.
