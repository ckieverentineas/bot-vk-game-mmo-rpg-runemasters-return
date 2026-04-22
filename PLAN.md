# PLAN — Runemasters Return

> Живой план релиза. Этот файл описывает фактическое состояние проекта, ближайшие блокеры и то, что не входит в релиз. История изменений живёт в `CHANGELOG.md`.

## Источники правды

- `README.md` — обзор текущего runtime и пользовательских возможностей.
- `ARCHITECTURE.md` — границы модулей, persistence/runtime contracts и replay-safety rails.
- `RELEASE_CHECKLIST.md` — практический gate перед релизом.
- `CHANGELOG.md` — история shipped-изменений и release notes.
- `docs/product/1-0-release-charter.md` — обещание 1.0, explicit out-of-scope и ethical retention boundaries.
- `docs/product/action-based-progression-and-trophy-loot.md` — committed design candidate для pending trophy rewards, action-based навыков, скрытого дропа и узких специализаций.
- `docs/reviews/*` — исторические decision snapshots. Если review-документ спорит с runtime, он должен быть помечен как superseded, а не использоваться как актуальный план.

## Что уже является базой

- Проект собран как TypeScript/VK bot с модульными слоями `application`, `domain`, `infrastructure`, `transport`.
- Prisma/SQLite используются для изменяемого runtime state: игроки, прогресс, руны, бои, reward ledger, command intents и telemetry.
- Статический world/rune content живёт в `src/content/**` и валидируется через `content:validate`.
- Основной маршрут игрока идёт через `Исследовать`: событие, встреча, выбор `В бой` / `Отступить`, бой, результат, возврат к исследованию.
- Боевой экран показывает состояние, тактические подсказки и инвертированный журнал: свежие события сверху, начало боя снизу как контекст.
- Player-facing тексты держатся в языке мира: без “нажмите”, “режим”, “статы”, “тип” и другой служебной воды там, где игрок должен читать след, бой, трофеи и путь мастера.
- Рунная сборка стартует с двух равноправных слотов. Обе надетые руны дают боевые черты, пассивы и активное действие, если оно есть.
- Экран рун показывает компактный список со счётчиком надетых рун, иконками школ, ролью архетипа и отдельной карточкой выбранной руны.
- Player-facing support-slot модель вырезана.
- Рост персонажа смещён к школам, mastery, рунам и будущей ветке мастера, а не к старой раздаче stat points за уровни.
- Action-based trophy rewards имеют первый playable vertical slice: победа создаёт `PENDING` reward ledger, доступные trophy actions фиксируются в snapshot, игрок видит post-battle trophy card с inline-кнопками, `начать` / `исследовать` возвращают к несобранной добыче, выбранное действие собирается exact-once, `claim_all` даёт быстрый безопасный сбор, а bootstrap восстанавливает потерянные pending-записи после рестарта.
- Есть защита от повторных наград, отрицательных остатков инвентаря, stale battle overwrite и повторного применения command intent.
- Есть smoke/regression/concurrency tests и release tooling для content validation, локального first-session playtest, summary, evidence и preflight.

## Что не считаем доказанным

- School-first path по всем четырём школам не считается release-proven, пока не пройден ручной playtest и `release:evidence` не перестал возвращать `insufficient_evidence`.
- Игровая версия считается только по commit-based правилу из `release:status`; `package.json` остаётся технической npm-метаинформацией и не является player-facing версией игры.
- Production database rollout не считается оформленным, пока нет явной процедуры backup + migration/deploy для SQLite.
- Action-based trophy rewards всё ещё не считаются release-proven, пока pending trophy collect/replay не пройден ручным playtest'ом и release evidence. Hidden drop pools, skill-threshold unlocks и stat growth остаются будущими срезами.

## Ближайший порядок работ

1. Прогнать technical gate после остановки бота: `npm run db:generate`, `npm run check`, `npm run release:local-playtest`, `npm run release:preflight`.
2. Пройти ручной playtest поверх автоматического first-session smoke: onboarding, encounter choice, fight/flee, rune hub, две руны, craft/reroll/destroy, четыре school paths, pending trophy collect/replay.
3. Собрать `npm run release:school-evidence` и `npm run release:evidence`; если verdict всё ещё `insufficient_evidence`, релиз не готов.
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
