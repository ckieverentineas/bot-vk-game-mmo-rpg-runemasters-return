# PLAN — Runemasters Return

## Runtime guardrails

- `✨ Сияние` добавлено как вторая мягко фармимая валюта без новых игровых таблиц: хранится в `Player.radiance`, показывается в меню/профиле/инвентаре, начисляется через optional `След дня`, проходит через reward/telemetry/evidence контракты и оставляет будущую покупку за ₽ вне текущего баланса.

- First-hour difficulty guardrails закрыты без новых таблиц: низкие HP/мана снижают следующую adaptive threat, поражение даёт безопасный floor восстановления, случайные elite-встречи не появляются до раннего safe-порога, а higher-biome roaming открывается только с уровня угрозы `10`.
- Post-defeat flow закрыт без радикальной экономики: экран поражения объясняет неначисленную добычу и сохранённый прогресс, показывает восстановленные HP/ману, ведёт в `🔮 Руны -> ⚔️ Осторожно дальше`, а следующий explore при `defeatStreak > 0` избегает school elite/miniboss и higher-biome roaming.
- Daily-free activity slice закрыт без новых таблиц: `✨ След дня` выдаёт одну мягкую награду за календарный день через существующий reward ledger, повтор показывает non-punitive copy, серий/штрафов/FOMO нет.

> Живой план релиза. Этот файл описывает фактическое состояние проекта, ближайшие блокеры и то, что не входит в релиз. История изменений живёт в `CHANGELOG.md`.

## Источники правды

- `README.md` — обзор текущего runtime и пользовательских возможностей.
- `ARCHITECTURE.md` — границы модулей, persistence/runtime contracts и replay-safety rails.
- `RELEASE_CHECKLIST.md` — практический gate перед релизом.
- `CHANGELOG.md` — история shipped-изменений и release notes.
- `docs/product/1-0-release-charter.md` — обещание 1.0, explicit out-of-scope и ethical retention boundaries.
- `docs/product/school-bible-v1.md` — product lock по идентичности школ, allowed/forbidden overlap и safe hidden trophy directions.
- `docs/product/bestiary-v1.md` — правила бестиария: локации по 5, скрытие мобов до встречи, скрытие добычи до первого обработанного трофея без новых таблиц.
- `docs/product/action-based-progression-and-trophy-loot.md` — committed design candidate для pending trophy rewards, action-based навыков, скрытого дропа и узких специализаций.
- `docs/product/lore-quests-home-continuation.md` — рабочая памятка по лору, `Книге путей` и следующим домашним срезам.
- `docs/content/content-pipeline-plan.md` — минимальный content package workflow и DoD для school/enemy/encounter/quest/season packages.
- `docs/reviews/*` — исторические decision snapshots. Если review-документ спорит с runtime, он должен быть помечен как superseded, а не использоваться как актуальный план.

## Что уже является базой

- Economy balance pass для пыли/осколков/эссенций включён: крафт тратит осколки и пыль, UNUSUAL+ требует материалы вроде эссенции, перековка стала ранним пылевым sink'ом, а `rune-economy` тесты держат 30-60 минут ранних боёв в проверяемом ресурсном коридоре.
- Рунный action hub player-facing называется `🕯 Алтарь`: главная кнопка, отдельный экран действий, stale/retry recovery и resource-find copy больше не разводят “мастерскую” и алтарь как разные места.
- Мастерская получила slice алхимии пилюль: трофейные материалы превращаются в `Пилюлю восстановления`, `Пилюлю ясности`, `Пилюлю стойкости` и `Пилюлю фокуса`, навык `Алхимия` повышает выход, а готовые пилюли применяются в бою или между встречами без постоянного роста статов.
- Проект собран как TypeScript/VK bot с модульными слоями `application`, `domain`, `infrastructure`, `transport`.
- Prisma/SQLite используются для изменяемого runtime state: игроки, прогресс, руны, бои, reward ledger, command intents и telemetry.
- Статический world/rune content живёт в `src/content/**` и валидируется через `content:validate`.
- Content pipeline для новых пакетов зафиксирован в `docs/content/content-pipeline-plan.md`; validator scope живёт рядом в `docs/content/validator-scope.md`.
- School bible v1 зафиксировал product lock для четырёх стартовых школ: чем владеют Пламя, Твердь, Буря и Прорицание, где им можно пересекаться, какие overlap запрещены и как безопасно добавлять school hidden trophy pools.
- Основной маршрут игрока идёт через `Исследовать`: событие, встреча, выбор `В бой` / `Отступить`, бой, результат, возврат к исследованию.
- Encounter variety v1 работает как слой поверх существующих локаций и врагов: засада отдаёт первый ход врагу и снижает шанс ухода, свежий след даёт игроку инициативу, усталый враг стартует с неполным HP, элитный след заранее маркирует сильную цель, а безопасная находка остаётся non-combat сценой без новых таблиц.
- Anti-stall recovery rails включены поверх attrition: низкое HP поднимает next-goal в `🌿 Передышку` и восстанавливает HP/ману через `PlayerProgress`, серия поражений ведёт к проверке рун или осторожной встрече, а resolver временно выбирает лёгкий обычный encounter без элит, боссов и roaming-скачков.
- Межбоевой attrition включён для HP/маны: `PlayerProgress` хранит текущие vitals, следующий battle snapshot стартует с них, а поражение поднимает игрока до безопасного floor по HP/мане.
- Динамическая сложность поддерживает бродячие встречи: мобы из ближайшего нижнего биома иногда появляются выше по уровню, а мобы из ближайшего верхнего биома очень редко заходят вниз; боссы не кочуют.
- Боевой экран показывает состояние, тактические подсказки и инвертированный журнал: свежие события сверху, начало боя снизу как контекст.
- Enemy intent уже является частью боевого выбора, а не только предупреждением: тяжёлый удар усиливает ценность `защиты`, guard-break делает чистую стойку плохим ответом, готовая активная руна получает маленькое окно по раскрытому замыслу, а action-based рост навыков остаётся привязан к battle action facts.
- School combat identity pass v1 работает поверх текущих рун и intent без новых таблиц: Пламя давит guard-break, Твердь держит тяжёлый телеграф, Буря темпует через `Шаг шквала`, а Прорицание называет прочитанный intent в результате хода.
- Доступность активных рун читается из одного read-model: экран и кнопки показывают стоимость маны, текущий откат, нехватку маны и `не тот момент` без изменения силы самих рун.
- Player-facing тексты держатся в языке мира: без “нажмите”, “режим”, “статы”, “тип” и другой служебной воды там, где игрок должен читать след, бой, трофеи и путь мастера.
- Onboarding получил лорную завязку Пустого мастера: игрок просыпается в Рунном Пределе, слышит первый осколок и выходит в учебный бой за первую руну.
- `📜 Книга путей` имеет первый vertical slice постоянных квестов: записи идут каруселью по 5, готовые награды поднимаются первыми, один ближайший actionable след держит направление, закрытые записи уходят в компактный архив, а claim идёт через inline-кнопки exact-once поверх reward ledger с лимитом VK rows.
- `📖 Бестиарий` имеет первый runtime slice: локации идут каруселью по 5, противники внутри локации скрыты до первой встречи, после встречи показывают повадку и рабочий ответ, а добыча раскрывается только после первого `APPLIED` трофея из существующего reward ledger.
- `✨ След дня` доступен как optional daily-free activity: один мягкий след дня даёт малую награду через `RewardLedgerRecord`, повтор не начисляет вторую награду и не давит серией или пропуском.
- Mastery milestones v1 держит раннюю школьную ветку компактной: 4 видимые вехи на `1/3/5/7` опыта школы открываются текущими победами с надетой школьной руной и читаются в профиле/рунах без новых таблиц и большого дерева навыков.
- Рунная сборка стартует с двух равноправных слотов. Обе надетые руны дают боевые черты, пассивы и активное действие, если оно есть.
- Экран рун показывает компактный список со счётчиком надетых рун, иконками школ, ролью архетипа и отдельной карточкой выбранной руны.
- VK-клавиатуры разнесены по сценариям (`main`, `battle`, `runes`, `rewards`, `quests`, `bestiary`, `tutorial`) с общим builder'ом и совместимым public barrel `src/vk/keyboards/index.ts`.
- Player-facing support-slot модель вырезана.
- Рост персонажа смещён к школам, mastery, рунам и будущей ветке мастера, а не к старой раздаче stat points за уровни.
- Action-based trophy rewards имеют расширенный playable vertical slice: победа создаёт `PENDING` reward ledger, доступные trophy actions фиксируются в snapshot, игрок видит post-battle trophy card с inline-кнопками, `начать` / `исследовать` возвращают к несобранной добыче, выбранное действие собирается exact-once, `claim_all` даёт быстрый безопасный сбор, bootstrap восстанавливает потерянные pending-записи после рестарта, первые threshold-срезы для `skinning`, `reagent_gathering` и `essence_extraction` дополняются enemy-kind действиями, а второй мини-порог качества для свежевания/сбора слизи даёт видимый +1 material payoff без новых таблиц.
- Combat skill growth теперь идёт от battle action facts, а не от парсинга журнала: успешная `ATTACK` даёт `combat.striking`, поднятая `DEFEND`-защита даёт `combat.guard`, активная руна с расходом маны или откатом даёт `rune.active_use`; начисление живёт в той же `saveBattle()` / `finalizeBattle()` транзакции, что и revision-guard боя.
- Есть защита от повторных наград, отрицательных остатков инвентаря, stale battle overwrite и повторного применения command intent.
- Есть smoke/regression/concurrency tests и release tooling для content validation, локального first-session playtest, summary, evidence и preflight.
- School novice trial evidence закрыт для четырёх школ: `release:school-evidence` показывает `Novice elite`, `UNUSUAL reward` и `RARE seal` по Пламени, Тверди, Бури и Прорицанию.
- Post-payoff school loop получил полный ранний runtime slice: aligned `UNUSUAL` novice reward ведёт игрока в `🔮 Руны`, фокусирует новый школьный знак, экипировка знака переключает next-goal на school miniboss, победа над miniboss выдаёт targeted `RARE` печать, а pending trophy card не теряет `post_session_next_goal_shown`.
- RARE seal теперь является началом новой ступени, а не финальной точкой дропа: после экипировки печати игрок видит `Цель печати`, получает малый school-specific seal-бонус и идёт к mastery rank 2.
- Payload auto-equip школьного знака в свободный второй слот теперь даёт тот же compact payoff recap и telemetry/evidence `equip_school_sign`, что и явная замена в основном слоте.
- `Книга путей` имеет local handler manual evidence и release-evidence funnel по open/claim/replay: `quest_book_opened`, `quest_reward_claimed` и `quest_reward_replayed` уже видны в `docs/testing/release-evidence-report.md`.

## Что не считаем доказанным

- School-first path по четырём школам теперь подтверждён автоматическим runtime evidence до `RARE seal`: `novice elite -> UNUSUAL знак -> rune hub/equip -> school miniboss -> RARE печать`. Текущий `release:evidence` всё ещё остаётся `warn` только из-за `return_recap_shown`: после экрана возврата пока нет follow-up proxy в отчёте.
- Игровая версия считается только по commit-based правилу из `release:status`; `package.json` остаётся технической npm-метаинформацией и не является player-facing версией игры.
- Production database rollout не считается оформленным, пока нет явной процедуры backup + migration/deploy для SQLite.
- Action-based trophy rewards имеют local handler manual evidence для pending trophy collect/replay в `docs/testing/pending-trophy-manual-playtest-q022.md`, но ещё не считаются полностью release-proven без release evidence или release-owner решения. Hidden drop pools за пределами первого Ember-среза, глубокие многоступенчатые threshold-лестницы и stat growth остаются будущими работами.

## Архитектурная гигиена

- Дробить проект малыми вертикальными срезами, сохраняя публичные импорты там, где это снижает риск.
- Функциональное ядро, компонентная оболочка: чистые formatter/resolver функции внутри модулей, сценарные компоненты вокруг них, public barrel для совместимости импортов.
- Presenter-декомпозиция VK-экранов разнесена по сценариям: `rewardMessages.ts`, `questMessages.ts`, `bestiaryMessages.ts`, `runeMessages.ts`, `battleMessages.ts`, `homeMessages.ts`, `profileMessages.ts` и `explorationMessages.ts` держат свои flow, а `message-formatting.ts`, `player-progress-formatting.ts` и `player-skill-formatting.ts` — общие чистые formatter'ы.
- Handler-декомпозиция продолжена: `gameCommandRoutes.ts` стал агрегатором, `routes/*CommandRoutes.ts` держат core/tutorial/battle/rune/reward/quest/bestiary маршруты, а `gameCommandRecovery.ts` — recoverable stale/retry/battle/rune контексты.
- Responder-декомпозиция продолжена: `responders/homeReplyFlow.ts`, `runeReplyFlow.ts`, `questReplyFlow.ts`, `bestiaryReplyFlow.ts`, `rewardReplyFlow.ts` и `battleReplyFlow.ts` держат рендер/клавиатуры home/profile/location экранов, рун, книги путей, бестиария, pending trophy rewards, battle result и exploration result, а `GameHandler` делегирует им reply-flow.
- `gameHandlerTelemetry.ts` держит transport-level telemetry payloads для return recap, school presentation, rune hub follow-up и post-session next-goal событий, оставляя `GameHandler` тонким orchestrator'ом поверх use-case и responder слоёв.
- `prisma-game-mappers.ts` держит чистые Prisma → runtime мапперы для player/battle records; `PrismaGameRepository` оставляет у себя транзакции, replay receipts, reward ledger и CAS-обновления.
- Следующий безопасный кандидат: выносить reward/battle persistence helpers малыми срезами, без механического распила транзакционных replay/concurrency rails.
- `PrismaGameRepository` не распиливать механически: сначала выделять чистые мапперы, snapshot hydration и reward/battle persistence helpers с тестами на replay/concurrency.

## Ближайший порядок работ

1. Прогнать technical gate после остановки бота: `npm run db:generate`, `npm run check`, `npm run release:local-playtest`, `npm run release:preflight`.
2. Пройти ручной playtest поверх автоматического first-session smoke: onboarding, encounter choice, fight/flee, rune hub, две руны, craft/reroll/destroy и четыре school paths. Quest book open/claim/replay уже закрыт local handler evidence в Q-011 и виден в `release:evidence`; pending trophy collect/replay уже закрыт local handler evidence в Q-022. Оба сценария можно повторить на живом боте перед релизом как optional smoke.
3. Собрать `npm run release:school-evidence` и `npm run release:evidence`; если verdict остаётся `warn` или хуже, релиз не готов без явного release-owner решения.
4. После evidence pass обновить `README.md`, `CHANGELOG.md`, `PLAN.md` и при необходимости `ARCHITECTURE.md` / `RELEASE_CHECKLIST.md`.
5. Подготовить минимальный ops-runbook: где `.env`, где SQLite DB, как запускается production-процесс, где логи и как откатываться.

## Отложено или вырезано из релиза

- Player-facing support-slot / passive-only second rune model.
- Отдельная кнопка `Проверить школу` как обязательный режим.
- Post-battle `Новый бой`, который обходит exploration resolver.
- Полная recovery/rest система поверх межбоевого attrition.
- Real-time PvP, open PvP, ganking и mandatory PvP.
- Free player market, auction-house economy и guild-war scale competition.
- Daily chores, hard streaks, absence punishment, exclusive power windows и pay-for-power.
- Глубокая crafting-игра как отдельный продукт внутри продукта.

## Правило документации

- Документы должны описывать runtime, который уже есть, или явно помечать идею как future/deferred.
- Если `.md` спорит с кодом, сначала исправляется или помечается документ. Код считается источником фактического поведения.
- Generated evidence reports не являются source of truth; они нужны как снимок конкретного release pass.
- Старые review-доки не удаляются автоматически, если на них есть исторические ссылки, но они не должны управлять текущим scope.
