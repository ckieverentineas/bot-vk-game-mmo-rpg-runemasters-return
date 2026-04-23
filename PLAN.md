# PLAN — Runemasters Return

> Живой план релиза. Этот файл описывает фактическое состояние проекта, ближайшие блокеры и то, что не входит в релиз. История изменений живёт в `CHANGELOG.md`.

## Источники правды

- `README.md` — обзор текущего runtime и пользовательских возможностей.
- `ARCHITECTURE.md` — границы модулей, persistence/runtime contracts и replay-safety rails.
- `RELEASE_CHECKLIST.md` — практический gate перед релизом.
- `CHANGELOG.md` — история shipped-изменений и release notes.
- `docs/product/1-0-release-charter.md` — обещание 1.0, explicit out-of-scope и ethical retention boundaries.
- `docs/product/action-based-progression-and-trophy-loot.md` — committed design candidate для pending trophy rewards, action-based навыков, скрытого дропа и узких специализаций.
- `docs/product/lore-quests-home-continuation.md` — рабочая памятка по лору, `Книге путей` и следующим домашним срезам.
- `docs/content/content-pipeline-plan.md` — минимальный content package workflow и DoD для school/enemy/encounter/quest/season packages.
- `docs/reviews/*` — исторические decision snapshots. Если review-документ спорит с runtime, он должен быть помечен как superseded, а не использоваться как актуальный план.

## Что уже является базой

- Проект собран как TypeScript/VK bot с модульными слоями `application`, `domain`, `infrastructure`, `transport`.
- Prisma/SQLite используются для изменяемого runtime state: игроки, прогресс, руны, бои, reward ledger, command intents и telemetry.
- Статический world/rune content живёт в `src/content/**` и валидируется через `content:validate`.
- Content pipeline для новых пакетов зафиксирован в `docs/content/content-pipeline-plan.md`; validator scope живёт рядом в `docs/content/validator-scope.md`.
- Основной маршрут игрока идёт через `Исследовать`: событие, встреча, выбор `В бой` / `Отступить`, бой, результат, возврат к исследованию.
- Боевой экран показывает состояние, тактические подсказки и инвертированный журнал: свежие события сверху, начало боя снизу как контекст.
- Player-facing тексты держатся в языке мира: без “нажмите”, “режим”, “статы”, “тип” и другой служебной воды там, где игрок должен читать след, бой, трофеи и путь мастера.
- Onboarding получил лорную завязку Пустого мастера: игрок просыпается в Рунном Пределе, слышит первый осколок и выходит в учебный бой за первую руну.
- `📜 Книга путей` имеет первый vertical slice постоянных квестов: игрок видит готовые награды по главам, один ближайший незавершённый след и компактный архив закрытых записей, а награды забирает через inline-кнопки exact-once поверх reward ledger.
- Рунная сборка стартует с двух равноправных слотов. Обе надетые руны дают боевые черты, пассивы и активное действие, если оно есть.
- Экран рун показывает компактный список со счётчиком надетых рун, иконками школ, ролью архетипа и отдельной карточкой выбранной руны.
- VK-клавиатуры разнесены по сценариям (`main`, `battle`, `runes`, `rewards`, `quests`, `tutorial`) с общим builder'ом и совместимым public barrel `src/vk/keyboards/index.ts`.
- Player-facing support-slot модель вырезана.
- Рост персонажа смещён к школам, mastery, рунам и будущей ветке мастера, а не к старой раздаче stat points за уровни.
- Action-based trophy rewards имеют расширенный playable vertical slice: победа создаёт `PENDING` reward ledger, доступные trophy actions фиксируются в snapshot, игрок видит post-battle trophy card с inline-кнопками, `начать` / `исследовать` возвращают к несобранной добыче, выбранное действие собирается exact-once, `claim_all` даёт быстрый безопасный сбор, bootstrap восстанавливает потерянные pending-записи после рестарта, а первые threshold-срезы для `skinning`, `reagent_gathering` и `essence_extraction` дополняются enemy-kind действиями без новых таблиц.
- Есть защита от повторных наград, отрицательных остатков инвентаря, stale battle overwrite и повторного применения command intent.
- Есть smoke/regression/concurrency tests и release tooling для content validation, локального first-session playtest, summary, evidence и preflight.
- School novice trial evidence закрыт для четырёх школ: `release:school-evidence` показывает `Novice elite`, `UNUSUAL reward` и `RARE seal` по Пламени, Тверди, Бури и Прорицанию.
- Post-payoff school loop получил полный ранний runtime slice: aligned `UNUSUAL` novice reward ведёт игрока в `🔮 Руны`, фокусирует новый школьный знак, экипировка знака переключает next-goal на school miniboss, победа над miniboss выдаёт targeted `RARE` печать, а pending trophy card не теряет `post_session_next_goal_shown`.
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
- Presenter-декомпозиция VK-экранов разнесена по сценариям: `rewardMessages.ts`, `questMessages.ts`, `runeMessages.ts`, `battleMessages.ts`, `homeMessages.ts`, `profileMessages.ts` и `explorationMessages.ts` держат свои flow, а `message-formatting.ts`, `player-progress-formatting.ts` и `player-skill-formatting.ts` — общие чистые formatter'ы.
- Handler-декомпозиция продолжена: `gameCommandRoutes.ts` стал агрегатором, `routes/*CommandRoutes.ts` держат core/tutorial/battle/rune/reward/quest маршруты, а `gameCommandRecovery.ts` — recoverable stale/retry/battle/rune контексты.
- Responder-декомпозиция продолжена: `responders/homeReplyFlow.ts`, `runeReplyFlow.ts`, `questReplyFlow.ts`, `rewardReplyFlow.ts` и `battleReplyFlow.ts` держат рендер/клавиатуры home/profile/location экранов, рун, книги путей, pending trophy rewards, battle result и exploration result, а `GameHandler` делегирует им reply-flow.
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
- Долговременная HP/мана attrition без отдельной recovery/rest системы.
- Real-time PvP, open PvP, ganking и mandatory PvP.
- Free player market, auction-house economy и guild-war scale competition.
- Daily chores, hard streaks, absence punishment, exclusive power windows и pay-for-power.
- Глубокая crafting-игра как отдельный продукт внутри продукта.

## Правило документации

- Документы должны описывать runtime, который уже есть, или явно помечать идею как future/deferred.
- Если `.md` спорит с кодом, сначала исправляется или помечается документ. Код считается источником фактического поведения.
- Generated evidence reports не являются source of truth; они нужны как снимок конкретного release pass.
- Старые review-доки не удаляются автоматически, если на них есть исторические ссылки, но они не должны управлять текущим scope.
