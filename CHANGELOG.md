# Changelog

Этот файл ведётся как журнал версий и должен отражать, что именно вошло в каждый коммит и релизную версию.

## Политика версий

- каждые `100` коммитов формируют новый релизный рубеж;
- самый первый коммит проекта = версия `0.01`;
- коммит `0.25` означает двадцать пятый коммит до рубежа `1.00`;
- коммит `1.00` — это сотый коммит;
- текущий расчёт статуса можно смотреть через `npm run release:status`.

## [Unreleased]

### Added

- player skill foundation для action-based progression: типы навыков, persistence `PlayerSkill`, доменный resolver шанса роста и применение skill experience через repository;
- pending trophy reward vertical slice: versioned pending reward snapshot, `RewardLedgerRecord` rail для `PENDING -> APPLIED`, создание pending-награды после победы, выбор trophy action при сборе и безопасный replay уже собранного результата;
- player-facing trophy card после победы и команда `добыча` / `награды`: игрок видит закреплённую базовую награду, варианты обработки трофея и ledger-scoped кнопки, а `начать` / `исследовать` возвращают к несобранной добыче вместо потери контекста;
- trophy card использует inline-клавиатуру для действий сбора лута, чтобы выбор обработки был привязан к конкретному сообщению с добычей;
- local playtest теперь проходит через сбор pending trophy reward и падает, если после победы остаётся открытая добыча; учебный spirit-трофей даёт первую эссенцию, а имена новых рун больше не дублируют слово `руна`;
- профиль игрока теперь показывает action-based навыки с рангом и прогрессом до следующего порога, чтобы трофейные действия не исчезали после сообщения о сборе;
- action-specific trophy rewards теперь моделируются от `enemy.kind` и `lootTable`: `skin_beast`, `gather_slime`, `extract_essence` и fallback `claim_all` могут давать материалы и skill points без повторного начисления базовой победной награды;
- bootstrap recovery [`RecoverPendingRewardsOnStart`](src/modules/rewards/application/use-cases/RecoverPendingRewardsOnStart.ts) восстанавливает отсутствующие pending reward ledger-записи для уже завершённых победных боёв до регистрации VK handlers;
- единый school-aware next-goal read-model в [`src/modules/player/application/read-models/next-goal.ts`](src/modules/player/application/read-models/next-goal.ts), чтобы `main menu`, `return recap`, `rune hub` и `battle result` опирались на одну и ту же ближайшую school-веху;
- read-model [`src/modules/player/application/read-models/acquisition-summary.ts`](src/modules/player/application/read-models/acquisition-summary.ts) для короткого player-facing recap'а “что изменилось?” после новой руны, новой редкости или unlock'а сборки;
- два ранних school-specific elite encounter hooks в `dark-forest`: `Пепельная ведунья` для pressure/detonation path Пламени и `Камнерогий таран` для guard/counter path Тверди;
- первый targeted same-school reward hook для этих элит: aligned победа теперь может гарантировать первую `необычную` руну нужной школы вместо полного упора в случайный drop;
- school novice guidance loop для `Пламени` и `Тверди`: next-goal теперь может вести игрока к первому испытанию школы и первой unusual rune без отдельной quest-системы;
- минимальный telemetry/evidence слой для early school loop: `school_novice_elite_encounter_started` и enriched `reward_claim_applied` payload теперь позволяют измерять старт и aligned payoff этого novice path;
- первая aligned unusual rune для `Пламени` и `Тверди` теперь закрепляется как `испытание школы пройдено`, а main menu / return recap / rune hub перестают вести себя так, будто игрок всё ещё просто ищет первую meaningful school-веху;
- после school trial recognition игра теперь умеет вести игрока к установке первого знака школы, если unusual руна уже получена, но ещё не надета;
- после aligned novice reward путь `UNUSUAL знак -> 🔮 Руны -> надеть знак` доведён до короткого handoff: battle/pending reward copy ведёт к rune hub, rune hub фокусирует новый школьный знак, а следующий goal после экипировки уводит к school miniboss;
- early school evidence теперь ловит и follow-up шаги после novice payoff: открыл ли игрок руны, надел ли знак школы и начал ли следующий бой после признания школы;
- после установки первого знака школы `Пламя` и `Твердь` теперь получают первый school-aligned miniboss continuation с targeted `RARE` reward hook и school-specific battle framing;
- первая targeted `RARE` руна после school miniboss теперь подаётся как `печать школы`, а recognition/next-goal слой ведёт игрока к её установке вместо немого возврата в общий гринд;
- `Прорицание` получило первый узкий school-first proof: `Слепой авгур` как novice elite, forced `UNUSUAL` reward и guidance loop вокруг чтения раскрытой угрозы на уже существующих intent rails;
- `Буря` теперь имеет первый полный ранний school path: `Шквальная рысь` как novice elite, `Владыка шквала` как school miniboss и targeted `RARE` payoff без новой tempo-системы;
- `Прорицание` теперь имеет первый полный ранний school path: `Слепой авгур` как novice elite, `Хранитель предзнамений` как school miniboss и targeted `RARE` payoff на уже существующих intent rails;
- tooling slice `release:school-evidence` теперь умеет собирать единый markdown-отчёт по school-first telemetry funnel из `GameLog`, чтобы baseline по 4 школам можно было оценивать не вручную по сырым логам;
- tooling slice `release:evidence` теперь собирает unified markdown-отчёт по runtime evidence: onboarding coverage, school payoff, next-goal/return clarity и QA/exploit guardrails в одном release review артефакте;
- tooling slice `release:local-playtest` теперь прогоняет first-session smoke на реальном `GameHandler` и SQLite в двух режимах: legacy text и keyboard payload с актуальными `stateKey`;
- design candidate `action-based progression and trophy loot` фиксирует будущую систему pending trophy rewards, action-based навыков, скрытого дропа от школ/рун/ролей и узких специализаций;
- первый чистый resolver трофейных действий по `enemy.kind`: `Свежевать`, `Собрать слизь`, `Извлечь эссенцию` и fallback `Забрать добычу`;
- telemetry baseline теперь закрывает и ранний onboarding funnel: `tutorial_path_chosen`, `first_school_presented` и `first_school_committed` дают evidence между `onboarding_started` и первым school payoff;
- установка первого знака школы теперь сразу даёт compact payoff recap в rune hub, а следующий бой сильнее подсказывает, как именно проверить новый стиль этой школы на практике;
- VK UX после первого знака школы теперь ведёт игрока обычным CTA `⚔️ Исследовать`, чтобы школьная проверка не выглядела отдельным обязательным режимом и могла проходить через общий exploration resolver;
- player-state hydration теперь проходит через compatibility-safe helper с current / legacy / future fixtures и repository hydration tests, чтобы persisted player state безопаснее переживал missing/unknown fields и rollback-сценарии;
- `content:validate` теперь содержит hard completeness gate для shipped school packages, чтобы 4 стартовые школы не уходили в релиз с тихим drift между identity, encounter hooks и reward/chase wiring;
- active battle теперь показывает compact combat clarity block с текущим состоянием боя и school-aware tactical hint, чтобы игроку было проще читать следующий meaningful ход без перегруза интерфейса;
- в бою появилась медленная регенерация маны при возврате хода игроку: рунные действия реже запираются насовсем, но ресурс всё ещё ограничен максимальной маной battle snapshot'а;
- `ExploreLocation` теперь может вернуть standalone exploration scene вместо боя: domain resolver выбирает outcome шага исследования, а VK handler только рендерит готовый результат без transport-owned игровых правил;
- standalone exploration scenes получили player-facing типы (`передышка`, `находка`, `школьный след`, `опасный знак`, `Мастер испытаний`) и более широкий пул non-combat PvE-сцен без скрытых таймеров, FOMO или срочных экономических крючков;
- `resource_find` exploration scene теперь может выдавать малую material-находку через exact-once inventory result: инвентарь меняется в той же command-intent транзакции, что и канонический ответ события, поэтому retry не дублирует награду;
- пул `resource_find` расширен несколькими ранними находками (`трава`, `кожа`, `кость`, `металл`) с наградой ровно `+1`, чтобы non-combat exploration был разнообразнее, но не подменял основной рост через бои, руны и школы;
- `Мастера` теперь дают короткие директорские строки не только в боевых encounter'ах, но и в standalone exploration-сценах: передышки, находки, опасные знаки, школьные следы и trial-master сцены получают честный PvE-framing без новой persistence-модели и без FOMO-давления;
- standalone exploration-сцены теперь чаще появляются вне tutorial-биома (`40%` вместо прежнего редкого ролла), чтобы маршрут ощущался исследованием с разными исходами, а не почти гарантированным боем;
- боевой исход исследования теперь сначала показывает фазу `встречи`: враг представлен до первого хода, VK-клавиатура даёт `⚔️ В бой` и `💨 Отступить`, а шанс отступления считается от ловкости с безопасными границами и нейтральным результатом `FLED`;
- exploration outcome logic вынесена в [`src/modules/exploration/domain/exploration-outcome.ts`](src/modules/exploration/domain/exploration-outcome.ts): use-case теперь оркестрирует replay/persistence, а не собирает encounter plan вручную;
- battle state UI теперь показывает игрока и врага симметричными блоками: имя, HP-bar, mana-bar и короткую строку боевых статов;
- HP/mana шкалы в battle state UI стали цветными: здоровье меняет цвет по уровню риска, мана остаётся синей;
- battle timeline в VK-сообщении теперь держит видимыми ключевые события хода, чтобы действие игрока не пропадало после реакции врага, намерения и регена маны;
- battle timeline стал адаптивным: короткие бои показывают весь сохранённый журнал, а длинные сохраняют первое событие, строку пропуска и последние события вместо жёсткого обрезания до четырёх строк;
- battle timeline теперь отображается инверсией боя: самые свежие события идут сверху, а начало боя остаётся внизу как контекстный якорь;
- battle keyboard теперь повторяет тот же язык, что и state-блок: кнопка защиты показывает прирост щита, рунный навык показывает КД/нехватку маны, а пустая рунная кнопка скрыта;
- battle keyboard теперь поддерживает две активные рунные кнопки `навык 1` / `навык 2`, а intent-state учитывает конкретный слот активного действия;
- Prisma migration `20260421120000_make_two_rune_slots_baseline` переводит `PlayerProgress.unlockedRuneSlotCount` на baseline `2` и поднимает старые значения ниже двух;
- command-intent rail получил общий `recordCommandIntentResult`, чтобы replay-safe команды могли сохранять не только мутации игрока или battle creation, но и чистые outcome-сцены без отдельной persistence-сущности;
- типобезопасный telemetry adapter [`RepositoryGameTelemetry`](src/modules/shared/infrastructure/telemetry/RepositoryGameTelemetry.ts) поверх существующего `GameLog` rail для semantic-событий UX и loadout flow;
- тесты на canonical next-goal read-model в [`src/modules/player/application/read-models/next-goal.test.ts`](src/modules/player/application/read-models/next-goal.test.ts).

### Changed

- player-facing copy в бою, трофеях, return recap, main menu, exploration-сценах и stale/retry ответах переписан ближе к языку мира: меньше “нажмите”, “режим”, “статы”, “тип” и служебных UI-ярлыков, больше следа, трофеев, развилки и летописи схватки;
- `Книга путей` теперь рендерится по плотным приоритетным секциям: готовые награды компактно сгруппированы по главам, раскрывается только один ближайший незавершённый след, а закрытые записи уходят в компактный архив по главам;
- профиль и результат обработки трофея теперь используют общий formatter навыков: player-facing copy показывает ранги и качественный прогресс вроде `Новичок свежевания`, а не сырые числа опыта;
- documentation reset: `PLAN.md`, `QUICKSTART.md` и `RELEASE_CHECKLIST.md` теперь описывают фактический runtime, текущие release blockers и недоказанные evidence-gate пункты вместо устаревших stat allocation / DB seed сценариев;
- `release:status`, `release:summary` и `release:preflight` больше не превращают ошибку чтения Git-истории в ложную версию `0.00`; commit count читается от корня проекта с одноразовым `safe.directory`, а некорректный вывод Git теперь падает явно;
- player-facing версия игры закреплена за commit-based политикой `release:status`, а `package.json` остаётся технической npm-метаинформацией;
- `PLAN.md` переписан как короткая актуальная карта текущих решений, ближайших шагов и cut/defer list; shipped-история остаётся в `CHANGELOG.md`, а старые support-slot review помечены как superseded вместо активных источников правды;
- `return recap`, главное меню, rune hub и завершённый бой теперь показывают не абстрактный следующий шаг, а ближайшую school-веху или ближайший loadout payoff без guilt/FOMO тона;
- rune hub теперь явно показывает ближайшую mastery-веху и её payoff, если игрок уже идёт к unlock'у школы или ближайшему loadout payoff;
- rune hub разделён на два шага: первый экран показывает только карусель из 5 рун со статусом `надета`, а выбор руны открывает отдельную карточку со статами, навыками и действиями `надеть` / `снять` / `распылить`;
- список рун стал компактнее: вместо служебных строк `Слоты` / `Надето` / `Список` он показывает счётчик `Рун надето`, иконки школ, роль архетипа и нормализует старые имена без дубля `руна руна`;
- выбранная руна в rune hub теперь показывает описания активного навыка и пассивных эффектов, включая стоимость маны и откат активного действия;
- VK-клавиатуры декомпозированы по сценариям (`main`, `battle`, `runes`, `rewards`, `tutorial`), а `src/vk/keyboards/index.ts` оставлен совместимым public barrel для существующих импортов;
- reward-presenter вынесен из общего `messages.ts` в `src/vk/presenters/rewardMessages.ts`, а повторяемые formatter'ы `Перемена` / `След` / имя руны собраны в `message-formatting.ts`;
- rune-presenter вынесен в `src/vk/presenters/runeMessages.ts`: rune hub, карточка руны и алтарь стали отдельным сценарным компонентом поверх чистых formatter-функций;
- battle-presenter вынесен в `src/vk/presenters/battleMessages.ts`: боевой экран, развилка встречи, шкалы, состояние рун, журнал и итог боя стали отдельным сценарным компонентом;
- оставшиеся общие VK-presenters разнесены по сценариям `homeMessages.ts`, `profileMessages.ts` и `explorationMessages.ts`, а `messages.ts` стал совместимым public barrel без экранной логики;
- recoverable stale/retry/battle/rune контексты вынесены из `gameCommandRoutes.ts` в `src/vk/handlers/gameCommandRecovery.ts`, чтобы обычные маршруты команд не смешивались с аварийным восстановлением;
- static/dynamic command routes разнесены по сценариям `routes/coreCommandRoutes.ts`, `tutorialCommandRoutes.ts`, `battleCommandRoutes.ts`, `runeCommandRoutes.ts` и `rewardCommandRoutes.ts`, а `gameCommandRoutes.ts` стал агрегатором совместимости;
- rune/reward reply-flow вынесены из `GameHandler` в `src/vk/handlers/responders/runeReplyFlow.ts` и `rewardReplyFlow.ts`, чтобы handler делегировал сборку presenter + keyboard сценарным responder-компонентам;
- battle/exploration reply-flow вынесен из `GameHandler` в `src/vk/handlers/responders/battleReplyFlow.ts`, а telemetry callbacks передаются responder'у через отдельный handler telemetry-компонент;
- home/profile/location reply-flow вынесен в `src/vk/handlers/responders/homeReplyFlow.ts`, чтобы старт, возврат, профиль, инвентарь и удаление персонажа собирались одним сценарным responder-компонентом;
- screen/battle telemetry payloads вынесены из `GameHandler` в `src/vk/handlers/gameHandlerTelemetry.ts`, чтобы обработчик не смешивал маршруты VK-команд с расчётом school/next-goal analytics;
- Prisma player/battle hydration мапперы вынесены из `PrismaGameRepository` в `src/modules/shared/infrastructure/prisma/prisma-game-mappers.ts`, не затрагивая транзакционные replay/concurrency rails;
- карточка руны теперь даёт одну кнопку `надеть`: выбранная руна автоматически занимает первый свободный слот, без выбора слота игроком;
- второй слот больше не является player-facing “поддержкой”: две стартовые руны равноправно дают полные статы, пассивы и активные действия в бою;
- telemetry `loadout_changed` больше не использует primary/support changeType: новое событие пишет нейтральный `equip_rune` / `unequip_rune` и 1-based `slotNumber`, чтобы будущие 3+ слоты не ломали модель;
- battle result теперь использует актуальный `PlayerState`, чтобы следующий шаг после боя не расходился с `return recap` и `main menu`;
- завершённый бой снова ведёт игрока через общий CTA `⚔️ Исследовать`, поэтому post-battle loop не выглядит отдельной кнопкой “нового боя” поверх exploration resolver;
- battle result и крафт руны теперь могут объяснить, что именно дала новая награда или unlock, а не оставлять игрока наедине с названием предмета;
- ранний encounter intro теперь может подсказывать, какая школа особенно хорошо отвечает на конкретный элитный pressure pattern, вместо немого появления врага без tactical framing;
- `RegisterPlayer`, `EquipCurrentRune`, `UnequipCurrentRune` и `GameHandler` теперь пишут telemetry v1 события `onboarding_started`, `loadout_changed`, `return_recap_shown` и `post_session_next_goal_shown` после committed transition или реально показанного экрана;
- runtime больше не читает биомы и шаблоны мобов из SQLite: world content стал file-first read-model'ю из `src/content/**`, а Prisma-схема очищена от таблиц статического контента.

### Fixed

- Повторная доставка legacy text `забрать награду` в `Книге путей` больше не выбирает следующую готовую запись: игрок получает тот же canonical claim result, а награда остаётся exact-once.

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

## [0.08] - 2026-04-17

### Commit

- `worktree` — `feat: modernize rune hub and smooth early combat`

### Added

- paging helper'ы рунной коллекции в [`src/modules/runes/domain/rune-collection.ts`](src/modules/runes/domain/rune-collection.ts) и тесты [`src/modules/runes/domain/rune-collection.test.ts`](src/modules/runes/domain/rune-collection.test.ts);
- новые боевые и балансные тесты [`src/modules/combat/domain/battle-engine.test.ts`](src/modules/combat/domain/battle-engine.test.ts), [`src/modules/world/domain/enemy-scaling.test.ts`](src/modules/world/domain/enemy-scaling.test.ts), [`src/modules/runes/domain/rune-factory.test.ts`](src/modules/runes/domain/rune-factory.test.ts).

### Changed

- VK rune UX собран в единый paged hub: экран [`renderRuneScreen()`](src/vk/presenters/messages.ts) показывает до четырёх рун на странице, выбор по слотам и быстрые действия без листания по одной руне;
- battle presentation стал компактнее и ориентирован на событие и следующий шаг, а завершённый бой теперь ведёт в новый забег через отдельную кнопку `⚔️ Новый бой`;
- после регистрации новый игрок получает tutorial-first keyboard вместо немедленного выброса в полное главное меню;
- стартовые статы новых персонажей, первые мобы Тёмного леса и правило первого хода выровнены под более честный early game;
- случайные природные rune drops теперь ограничены по максимальной редкости в зависимости от уровня локации, чтобы старт не ломался lucky jackpot'ом.

### Fixed

- коллекция рун больше не упирается в устаревший one-by-one browsing как единственный способ найти нужную руну;
- первый боевой цикл больше не должен так часто ощущаться как auto-loss из-за слабого стартового героя и перегретых стартовых мобов;
- adaptive difficulty теперь меньше переоценивает intelligence и magic defence до появления полноценной магической боевой системы.

## [0.09] - 2026-04-17

### Commit

- `worktree` — `feat: ship first playable rune combat slice`

### Added

- новый battle state contract с rune loadout snapshot, mana/cooldown state и защитным guard-эффектом прямо в боевом snapshot'е;
- боевые тесты на активные рунные действия и tutorial reward rails в [`src/modules/combat/domain/battle-engine.test.ts`](src/modules/combat/domain/battle-engine.test.ts) и [`src/modules/combat/domain/reward-engine.test.ts`](src/modules/combat/domain/reward-engine.test.ts);
- helper [`buildBattlePlayerSnapshot()`](src/modules/combat/domain/build-battle-player-snapshot.ts), который связывает экипированную руну и боевое состояние без новой Prisma-схемы.

### Changed

- команды `навыки` / `спелл` теперь больше не preview-заглушка, а запускают реальное боевое действие экипированной руны, если оно доступно;
- tutorial victory теперь гарантирует первую активную руну и ведёт игрока в loop `получил руну -> надел -> применил в бою`;
- battle UI показывает состояние руны, ману, откат, защиту и более ясный next step после победы/дропа руны;
- `PerformBattleAction` и recovery flow теперь работают через единый battle action resolver, а не только через базовую атаку.

### Fixed

- rune fantasy больше не обрывается на описаниях: как минимум часть активных рун действительно влияет на бой;
- игрок после tutorial больше не остаётся без явной следующей цели;
- stale нажатия по рунному действию при отсутствии маны/откате теперь возвращают боевой экран с понятной ошибкой, а не выбрасывают игрока из flow.

## [0.10] - 2026-04-17

### Commit

- `worktree` — `feat: add guard action and telegraphed enemy heavy strikes`

### Added

- универсальное боевое действие `защита`, доступное даже без активной руны;
- первый enemy intent pattern: часть врагов заранее готовит `Тяжёлый удар`, который читается в UI и логах;
- дополнительные тесты на defend flow, тяжёлый удар, stale battle input и persistence hydration для новых combat fields.

### Changed

- battle keyboard теперь даёт треугольник решений `атака / защита / рунное действие` вместо чистого давления одной-двумя кнопками;
- battle screen получил блок `Доступные действия` и явную строку намерения врага, чтобы решение читалось без угадывания;
- keyboard labels рунного действия расшифровывают `КД` и стоимость маны текстом, а не только символами.

### Fixed

- бой перестаёт схлопываться в примитивное `атака или навык по кулдауну`, потому что защита теперь является реальным ответом на телеграфируемую угрозу;
- stale боевые нажатия остаются в контексте активного боя и не выбрасывают игрока из flow;
- новый enemy intent и defend state переживают save/load hydration без потери состояния.

## [0.11] - 2026-04-17

### Commit

- `worktree` — `feat: add anti-guard enemy intent and deepen battle reads`

### Added

- второй enemy intent: враг может заранее готовить guard-break удар, который делает слепую защиту плохим ответом;
- новые тесты на telegraph/resolve guard-break, stale боевой контекст и battle copy для разных enemy intent.

### Changed

- battle action block теперь не только показывает готовность навыка, но и кратко объясняет тактическую роль рунного действия;
- бой перестал сводиться к одному телеграфу: теперь игроку нужно отличать, когда `защита` правильна, а когда враг специально играет против неё.

### Fixed

- треугольник решений `атака / защита / рунное действие` больше не разваливается в один шаблонный ответ на любой warning;
- состояние enemy intent по-прежнему гидратируется из snapshot без потери контекста после save/load.

## [0.12] - 2026-04-17

### Commit

- `worktree` — `feat: make starter rune schools feel mechanically distinct`

### Added

- battle-only passive resolver для стартовых школ, чтобы school identity реально влияла на решения в бою;
- дополнительные тесты на пассивное давление Пламени, усиленную защиту Тверди и чтение телеграфов через Прорицание.

### Changed

- player-facing слой больше говорит про `школы`, а не про внутренние `архетипы`;
- rune screen, main menu и battle screen теперь объясняют не только цифры, но и стиль школы;
- пассивные школы больше не выглядят как “пустые”: они влияют на базовую атаку и защиту уже в текущем combat loop.

### Fixed

- школа руны перестаёт быть просто лейблом поверх статов и становится реальным слоем боевой идентичности;
- ранний player journey лучше объясняет, зачем менять стиль и чем школы отличаются друг от друга.

## [0.13] - 2026-04-17

### Commit

- `worktree` — `feat: complete the first Stone school package`

### Added

- новый активный навык школы Тверди — `Каменный отпор`, который даёт урон и защиту в одном ответе;
- дополнительные тесты на content wiring школы Тверди и её боевое поведение.

### Changed

- школа Тверди больше не выглядит passive-only: у неё теперь есть и защитная пассивка, и активный school move;
- rune/battle copy сильнее подсказывает play pattern школы, а не только её flavour.

### Fixed

- стартовый school roster стал ближе к полноценному v1: Твердь больше не ощущается недоделанной школой на фоне Пламени и Бури;
- school-first UX лучше объясняет, как именно играть через Твердь и когда её стоит выбирать.

## [0.14] - 2026-04-17

### Commit

- `worktree` — `feat: separate player-facing schools from internal archetypes`
- `worktree` — `feat: freeze reward and loadout persistence contracts`

### Added

- явная модель `школа -> архетип` в `PLAN.md` и `README.md`, чтобы продуктовая и техническая терминология больше не конфликтовали;
- player-facing school presentation layer теперь хранит не только fantasy и play pattern, но и роль стартового архетипа;
- versioned platform contracts `LoadoutSnapshot`, `RewardIntent` и `RewardLedger` в [`src/modules/shared/domain/contracts`](src/modules/shared/domain/contracts);
- тесты на новые persistence-контракты и repository-level replay/loadout hydration regressions в [`src/modules/shared/domain/contracts/contracts.test.ts`](src/modules/shared/domain/contracts/contracts.test.ts) и [`src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts);
- новая Prisma-модель `RewardLedgerRecord` в [`prisma/schema.prisma`](prisma/schema.prisma) для append-only audit trail по reward claim'ам.

### Changed

- стартовые player-facing школы переименованы в более сильные fantasy-домены: **Пламя**, **Твердь**, **Буря**, **Прорицание**;
- legacy `archetypeCode` сохранён как внутренний key, но архетип в контенте и snapshot теперь трактуется как боевая роль: **Штурм**, **Страж**, **Налётчик**, **Провидец**;
- rune screen, battle screen, reward copy и main menu теперь объясняют игроку не только школу, но и её роль;
- [`buildBattlePlayerSnapshot()`](src/modules/combat/domain/build-battle-player-snapshot.ts) теперь собирает battle loadout через versioned `LoadoutSnapshot`, а [`PrismaGameRepository`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts) сохраняет этот snapshot отдельно от battle runtime state;
- победная финализация боя теперь возвращает canonical persisted battle и записывает exact-once reward claim в ledger вместо раздельного write-path по `droppedRune`;
- battle reward copy в [`renderBattle()`](src/vk/presenters/messages.ts:409) теперь прямо говорит игроку, что это именно награда за победу.

### Fixed

- публичный слой больше не опирается на черновые названия вроде `Уголь` и `Камень` как на финальные школы;
- различие между “магическим путём” и “боевым стилем” теперь задокументировано и лучше читается в продукте;
- повторный retry / replay завершённого победного боя больше не должен показывать локально переролленную награду, если canonical результат уже был сохранён;
- save/load active battle теперь может восстановить battle rune loadout из versioned contract даже если legacy `playerSnapshot` ещё не содержит этих полей;
- unsupported loadout snapshot version без legacy fallback больше не маскируется молча под пустое состояние.

## [0.15] - 2026-04-18

### Commit

- `worktree` — `feat: harden battle retries with concurrency rails`

### Added

- Prisma-backed concurrency regression lane в [`src/modules/shared/infrastructure/prisma/PrismaGameRepository.concurrency.test.ts`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.concurrency.test.ts) для active battle mutations, reward finalization и critical rune spend flows;
- docs bundle для retry/concurrency safety: [`docs/platform/retry-handling-rules.md`](docs/platform/retry-handling-rules.md), [`docs/qa/reward-duplication-matrix.md`](docs/qa/reward-duplication-matrix.md), [`docs/testing/concurrency-critical-use-cases.md`](docs/testing/concurrency-critical-use-cases.md);
- новый battle audit log `battle_stale_action_rejected` для stale overwrite rejection на active battle.

### Changed

- [`BattleSession`](prisma/schema.prisma) получил `actionRevision`, а [`PrismaGameRepository`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts) теперь проводит `saveBattle()` и `finalizeBattle()` через compare-and-swap по revision;
- duplicate/stale battle branches теперь возвращают canonical latest state вместо перезаписи более нового turn state;
- release docs и roadmap синхронизированы под duplication matrix, retry rules и mandatory concurrency coverage.

### Fixed

- спам боевых действий больше не должен давать stale branch шанс затереть более новый active battle state;
- parallel finalize одного и того же победного боя больше не должно начислять награду или rune drop больше одного раза;
- parallel craft / reroll / destroy с последним бюджетом теперь имеют реальную Prisma-backed regression coverage, а не только mock-level ожидания.

## [0.16] - 2026-04-18

### Commit

- `worktree` — `feat: version battle snapshots for migration safety`

### Added

- versioned contract `BattleSnapshot` в [`src/modules/shared/domain/contracts/battle-snapshot.ts`](src/modules/shared/domain/contracts/battle-snapshot.ts) и additive Prisma-column [`BattleSession.battleSnapshot`](prisma/schema.prisma) для mutable battle JSON;
- checked-in compatibility fixtures в [`src/modules/shared/infrastructure/prisma/fixtures`](src/modules/shared/infrastructure/prisma/fixtures) для legacy battle snapshots, current `schemaVersion: 1` payload и future-version fallback case;
- policy doc [`docs/platform/persistence-versioning-rules.md`](docs/platform/persistence-versioning-rules.md) для battle/loadout/reward persistence versioning.

### Changed

- [`PrismaGameRepository`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts) теперь dual-writes versioned `battleSnapshot`, но по-прежнему умеет читать legacy `playerSnapshot` / `enemySnapshot` / `log` / `rewardsSnapshot` как compatibility fallback;
- repository tests и contract tests теперь проверяют versioned battle hydration, fixture-based legacy fallback и future-version fallback behavior;
- release docs и roadmap синхронизированы под battle snapshot versioning и compatibility fixtures.

### Fixed

- save/load active battle больше не зависит только от raw JSON колонок без явной схемы версии;
- unsupported future battle snapshot version теперь не ломает загрузку боя, если legacy snapshot columns ещё доступны для safe fallback;
- migration safety вокруг battle persistence больше не остаётся неявной и без checked-in fixtures.

## [0.17] - 2026-04-18

### Commit

- `worktree` — `feat: extract canonical school definitions`

### Added

- новый content seed [`src/content/runes/schools.ts`](src/content/runes/schools.ts) и contract `SchoolDefinition` в [`src/shared/types/game.ts`](src/shared/types/game.ts) как canonical source of truth для player-facing school identity;
- контентная валидация school ↔ archetype wiring и тесты на school definition / content validation drift в [`src/content/validation/validate-game-content.test.ts`](src/content/validation/validate-game-content.test.ts) и [`src/modules/runes/domain/rune-schools.test.ts`](src/modules/runes/domain/rune-schools.test.ts).

### Changed

- [`rune-schools.ts`](src/modules/runes/domain/rune-schools.ts) больше не держит hand-written presentation map: school presentation теперь выводится из `SchoolDefinition` и связанного стартового архетипа;
- [`runeArchetypeSeed`](src/content/runes/archetypes.ts) теперь явно связывает архетип со школой через `schoolCode`, чтобы future content growth не держался на неявном совпадении кодов;
- docs и roadmap синхронизированы под canonical school contract вместо разрозненных identity maps.

### Fixed

- player-facing school identity больше не рискует расходиться между content seed и transport presentation map;
- content validation теперь ловит разрыв между школой и её стартовым архетипом до seed/check/release;
- следующая волна school-first UX и content authoring получила одно место правды вместо параллельных карт описаний.

## [0.18] - 2026-04-18

### Commit

- `worktree` — `feat: rewrite school-first onboarding framing`

### Added

- presenter tests для school-first onboarding framing в [`src/vk/presenters/messages.test.ts`](src/vk/presenters/messages.test.ts);
- smoke assertions для welcome/tutorial/skip-training flow в [`src/vk/handlers/gameHandler.smoke.test.ts`](src/vk/handlers/gameHandler.smoke.test.ts), чтобы early-school copy не деградировал незаметно.

### Changed

- [`renderWelcome()`](src/vk/presenters/messages.ts), [`renderLocation()`](src/vk/presenters/messages.ts) и empty [`renderRuneScreen()`](src/vk/presenters/messages.ts) теперь объясняют ранний путь игрока как `базовая атака -> первая руна -> школа рун -> стиль боя`;
- tutorial/main-menu copy теперь сильнее связывает первую руну с открытием школы рун и не продвигает внутренний жаргон;
- release docs и roadmap синхронизированы под завершённый school-first onboarding framing slice.

### Fixed

- onboarding больше не выглядит как просто технический tutorial mode без объяснения, зачем игроку нужна первая руна;
- первый экран и учебная зона теперь лучше подводят к school-first fantasy вместо generic "безопасной зоны";
- empty rune screen больше не обрывает раннюю мотивацию до получения первой руны.

## [0.19] - 2026-04-18

### Commit

- `worktree` — `feat: lock post-session next goals`

### Added

- presenter tests для next-goal messaging после победы/поражения в [`src/vk/presenters/messages.test.ts`](src/vk/presenters/messages.test.ts);
- smoke-check на battle completion CTA в [`src/vk/handlers/gameHandler.smoke.test.ts`](src/vk/handlers/gameHandler.smoke.test.ts).

### Changed

- [`renderBattle()`](src/vk/presenters/messages.ts) теперь завершает completed battle единым block'ом `🎯 Следующая цель` вместо разрозненного `Действие:`;
- победа с rune drop теперь объясняет, зачем сразу открыть `🔮 Руны`, а обычная победа и поражение дают честный ближайший шаг без давления;
- release docs и roadmap синхронизированы под post-session next-goal format.

### Fixed

- battle result screen больше не заканчивается плоским CTA без мотивации;
- победа без дропа и поражение теперь лучше подсказывают ближайший осмысленный шаг;
- post-session copy теперь держит единый поддерживающий тон вместо смеси `Действие:` и общих фраз.

## [0.20] - 2026-04-18

### Commit

- `worktree` — `feat: add calm return recap flow`

### Added

- новый presenter [`renderReturnRecap()`](src/vk/presenters/messages.ts) и test coverage для re-entry recap / no-guilt wording в [`src/vk/presenters/messages.test.ts`](src/vk/presenters/messages.test.ts);
- smoke coverage для resume-start, `пропустить обучение`, и `в приключения` в [`src/vk/handlers/gameHandler.smoke.test.ts`](src/vk/handlers/gameHandler.smoke.test.ts).

### Changed

- existing-player `начать` теперь показывает краткий recap с текущим состоянием, стилем боя, фокусом и одним честным следующим шагом;
- `пропустить обучение` и `в приключения` теперь возвращают в main loop через спокойный return recap вместо сырого status/menu ответа;
- player-facing copy очищен от pressure wording вроде `удержать темп` и `вернуться в ритм`.

### Fixed

- return flow больше не начинается с сухого "Ваш мастер уже существует" без восстановления контекста;
- skip/return commands теперь лучше подсказывают ближайший осмысленный шаг при re-entry;
- presenter layer получил return recap без новых persistence/state контрактов и без guilt/FOMO тональности.

## [0.21] - 2026-04-18

### Commit

- `worktree` — `docs: add telemetry plan v1`

### Added

- новый source-of-truth doc [`docs/telemetry/telemetry-plan.md`](docs/telemetry/telemetry-plan.md) с event map, review questions, owners, review cadence и deferred scope для telemetry v1.

### Changed

- `PLAN.md` теперь фиксирует telemetry plan как закрытый Phase 1 artifact для onboarding clarity, school pick rates, loadout engagement, economy health и exploit signals;
- `README.md` и `RELEASE_CHECKLIST.md` теперь явно ссылаются на telemetry plan как на release/review artifact для player-facing decision flows.

### Fixed

- telemetry больше не остаётся размазанной задачей без одного source-of-truth doc;
- product review по onboarding / return / economy получил минимальную decision-grade event рамку без premature analytics platform scope.

## [0.22] - 2026-04-18

### Commit

- `worktree` — `docs: add content pipeline plan v1`

### Added

- source-of-truth docs [`docs/content/content-pipeline-plan.md`](docs/content/content-pipeline-plan.md) и [`docs/content/validator-scope.md`](docs/content/validator-scope.md) для content packages, validator tiers и owner/review flow;
- template [`docs/content/templates/school-package-template.md`](docs/content/templates/school-package-template.md) как минимальный rail для school package completeness.

### Changed

- `PLAN.md` теперь фиксирует content pipeline plan как закрытый artifact для schools / enemies / encounters / quests / season chronicle configs;
- `README.md` и `RELEASE_CHECKLIST.md` теперь ссылаются на content pipeline docs как на release/review artifacts для content package shape changes.

### Fixed

- content throughput больше не остаётся roadmap ambition без одного source-of-truth doc;
- validator scope больше не смешивает hard blockers, warnings и deferred checks в одну неявную кучу.

## [0.23] - 2026-04-18

### Commit

- `worktree` — `feat: lock reward rng authority`

### Added

- RNG port [`GameRandom`](src/modules/shared/application/ports/GameRandom.ts) и infrastructure implementation [`SystemGameRandom`](src/modules/shared/infrastructure/random/SystemGameRandom.ts);
- policy doc [`docs/platform/rng-authority-rules.md`](docs/platform/rng-authority-rules.md) для craft / reroll / victory drop authority.

### Changed

- [`RuneFactory`](src/modules/runes/domain/rune-factory.ts), [`RewardEngine`](src/modules/combat/domain/reward-engine.ts), [`CraftRune`](src/modules/runes/application/use-cases/CraftRune.ts), [`RerollCurrentRuneStat`](src/modules/runes/application/use-cases/RerollCurrentRuneStat.ts) и victory reward resolution теперь получают RNG через explicit port вместо hidden inline randomness;
- retry/reward docs и QA matrix синхронизированы под canonical random outcome rules.

### Fixed

- reward-bearing random flows больше не зависят от прямого `Math.random()` в craft / reroll / victory drop path;
- тесты на rune generation, reroll и reward drop теперь могут доказывать deterministic authority через stubbed RNG.

## [0.24] - 2026-04-18

### Commit

- `worktree` — `feat: dedupe replayed rune mutations`

### Added

- command replay policy [`docs/platform/command-intent-rules.md`](docs/platform/command-intent-rules.md) и persistence receipt model `CommandIntentRecord` для keyboard rune mutations;
- handler/router test coverage для `intentId` transport payload propagation и duplicate replay protection.

### Changed

- keyboard buttons for rune craft / reroll / destroy now emit `intentId` payloads;
- repository persists canonical command receipts and returns stored post-mutation snapshots for duplicate same-intent craft / reroll / destroy instead of applying twice;
- retry/release/QA docs synchronized under keyboard intent replay semantics.

### Fixed

- duplicate VK delivery of the same rune-mutation intent no longer turns enough shards into extra legitimate crafts/rerolls;
- duplicate destroy replay no longer risks a second refund when the first result is already persisted.

## [0.25] - 2026-04-18

### Commit

- `worktree` — `docs: add social abuse release gate checklist`

### Added

- QA source-of-truth doc [`docs/qa/alt-account-guild-pvp-abuse-checklist.md`](docs/qa/alt-account-guild-pvp-abuse-checklist.md) for alt-account abuse, circle/social-lite collusion, and optional async PvP release-gate review.

### Changed

- `PLAN.md` now marks the alt-account / guild / PvP abuse checklist slice as done and logs the shipped docs milestone;
- `RELEASE_CHECKLIST.md` now conditionally requires the new checklist when social/PvP reward loops or circle contribution flows change.

### Fixed

- social-lite and optional async PvP scope no longer rely on an implicit abuse review with no single release-gate document;
- release review now has a narrow, current-state checklist without prematurely expanding scope into full anti-fraud, trading, guild wars, or real-time PvP.

## [0.39] - 2026-04-18

### Commit

- `9984996` — `fix: harden explore and rune navigation replay guards`

### Added

- тесты exact-once/recovery для [`ExploreLocation`](src/modules/exploration/application/use-cases/ExploreLocation.test.ts), [`GetActiveBattle`](src/modules/combat/application/use-cases/GetActiveBattle.test.ts), rune page/slot use-cases и transport smoke-paths;
- exploration command-state key для `explore` и replay/rule updates в [`docs/platform/command-intent-rules.md`](docs/platform/command-intent-rules.md) и [`docs/platform/retry-handling-rules.md`](docs/platform/retry-handling-rules.md).

### Changed

- [`ExploreLocation`](src/modules/exploration/application/use-cases/ExploreLocation.ts) теперь проводит `исследовать` через command-intent replay rail для keyboard payloads и legacy text ids;
- main menu, tutorial и battle-result keyboards теперь выдают scoped `intentId + stateKey` для `⚔️ Исследовать`, а router/handler протягивают их до use-case'ов;
- [`PrismaGameRepository`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts) теперь умеет canonical replay для `EXPLORE_LOCATION` и rune page/slot navigation, а battle recovery добивает зависший enemy-turn до сохранённого канонического состояния.

### Fixed

- duplicate `исследовать` больше не должен создавать второй encounter или переролливать врага при повторной доставке одного и того же intent;
- stale rune page/slot input больше не должен тихо ретаргетить уже другой экран рун;
- stuck enemy-turn recovery больше не должен оставлять игрока в подвешенном активном бою без канонического persisted result.

## [0.40] - 2026-04-18

### Commit

- `ace901c` — `fix: dedupe tutorial entry retries`

### Added

- intent-state rail для tutorial-entry path [`buildEnterTutorialModeIntentStateKey()`](src/modules/exploration/application/command-intent-state.ts);
- replay/stale regression coverage для [`EnterTutorialMode`](src/modules/exploration/application/use-cases/EnterTutorialMode.test.ts), router intent normalization, main-menu keyboard payloads и handler recovery.

### Changed

- [`EnterTutorialMode`](src/modules/exploration/application/use-cases/EnterTutorialMode.ts) теперь поддерживает same-intent replay для payload и legacy text `локация` / `обучение`, но режет stale replays после exploration drift;
- main-menu button `📘 Обучение` теперь получает scoped `intentId + stateKey`, а router/handler протягивают tutorial-entry intent metadata так же, как и остальные guarded exploration actions;
- repository retry docs и PLAN progress синхронизированы под новый tutorial-entry rail.

### Fixed

- duplicate `локация` / `обучение` больше не должны возвращать игрока в устаревший tutorial screen после перехода в adventure flow;
- старый tutorial-entry replay больше не должен маскировать активный бой или более свежий exploration context.

## [0.41] - 2026-04-18

### Commit

- `85f3b06` — `docs: sync plan and changelog`

### Changed

- `PLAN.md` синхронизирован с shipped retry-handling slices для `explore` и `enter tutorial mode`;
- `CHANGELOG.md` получил записи `0.39` и `0.40`, чтобы release history снова соответствовала фактическим коммитам и roadmap progress.

### Fixed

- журнал версии и roadmap log больше не отстают от уже закоммиченных retry-handling изменений.

## [0.42] - 2026-04-19

### Commit

- `worktree` — `fix: exact-once delete confirmation replay`

### Added

- account-scoped replay receipt [`DeletePlayerReceipt`](prisma/schema.prisma) и миграция [`prisma/migrations/20260418230500_add_delete_player_receipts/migration.sql`](prisma/migrations/20260418230500_add_delete_player_receipts/migration.sql) для destructive delete-confirm flow;
- repository/unit/concurrency coverage для delete-confirm retries в [`src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.test.ts), [`src/modules/shared/infrastructure/prisma/PrismaGameRepository.concurrency.test.ts`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.concurrency.test.ts), [`src/modules/player/application/use-cases/DeletePlayer.test.ts`](src/modules/player/application/use-cases/DeletePlayer.test.ts) и [`src/vk/handlers/gameHandler.smoke.test.ts`](src/vk/handlers/gameHandler.smoke.test.ts).

### Changed

- [`DeletePlayer`](src/modules/player/application/use-cases/DeletePlayer.ts) и delete-confirm handler path теперь работают через scoped `intentId + stateKey`, а не только через ad-hoc stale check по `updatedAt`;
- [`PrismaGameRepository`](src/modules/shared/infrastructure/prisma/PrismaGameRepository.ts) теперь подтверждает удаление через canonical receipt, который переживает удаление player row и безопасно отвечает на duplicate same-intent retry;
- retry docs и `PLAN.md` синхронизированы под new delete-confirm exact-once rail.

### Fixed

- duplicate `🗑️ Да, удалить` больше не должен сваливаться в `player_not_found` после уже успешного удаления персонажа;
- stale delete confirm больше не должен рисковать удалением нового персонажа, созданного на том же `vkId` после предыдущего удаления.

## [0.43] - 2026-04-19

### Commit

- `worktree` — `fix: guard legacy text rune navigation retries`

### Added

- regression coverage для legacy text rune navigation в [`src/modules/runes/application/use-cases/MoveRuneCursor.test.ts`](src/modules/runes/application/use-cases/MoveRuneCursor.test.ts), [`src/modules/runes/application/use-cases/SelectRunePageSlot.test.ts`](src/modules/runes/application/use-cases/SelectRunePageSlot.test.ts), [`src/vk/router/commandRouter.test.ts`](src/vk/router/commandRouter.test.ts) и [`src/vk/handlers/gameHandler.smoke.test.ts`](src/vk/handlers/gameHandler.smoke.test.ts);
- `PLAN.md` теперь явно закрывает remaining supported mutation-path audit для `11.5 repeated command / retry handling`.

### Changed

- [`commandRouter`](src/vk/router/commandRouter.ts) теперь выдаёт server-owned legacy text intent ids для `+руна`, `-руна`, `руны >`, `руны <`, `руна слот 1..4` и их alias;
- [`MoveRuneCursor`](src/modules/runes/application/use-cases/MoveRuneCursor.ts) и [`SelectRunePageSlot`](src/modules/runes/application/use-cases/SelectRunePageSlot.ts) теперь используют тот же same-intent replay rail для legacy text rune navigation, что и keyboard navigation;
- docs retry/intent rules синхронизированы под закрытие последнего supported legacy mutation gap в Phase 1 scope.

### Fixed

- duplicate same-message rune navigation больше не должна двигать курсор или выбор руны второй раз при повторной доставке одного и того же text command;
- historical alias `>>руна` / `<<руна` / `++руна` / `--руна` больше не обходят replay rail и теперь нормализуются в тот же guarded legacy intent envelope.

## [0.44] - 2026-04-19

### Commit

- `worktree` — `docs: lock vertical slice scope v1`

### Added

- gate-review artifact [`docs/reviews/phase-1-exit-gate.md`](docs/reviews/phase-1-exit-gate.md) с verdict по `PLAN.md 11.6`, scope lock, contract baseline и explicit cut/defer list для Vertical Slice;
- явный source-of-truth link на Phase 1 exit gate review в [`README.md`](README.md).

### Changed

- `PLAN.md` теперь фиксирует, что Vertical Slice scope lock и high-risk out-of-scope review доставлены через Phase 1 exit-gate review;
- committed Vertical Slice сужен до одного polished PvE-first early-to-mid journey с `Пламенем` и `Твердью`, без social/PvP и risky breadth в near-term order.

### Fixed

- ближайший delivery order больше не обещает расползающийся Vertical Slice “про всё сразу”; risky breadth вынесена в explicit deferred/out-of-scope register.

## [0.45] - 2026-04-19

### Commit

- `worktree` — `docs: approve 1.0 release charter`

### Added

- product source-of-truth [`docs/product/1-0-release-charter.md`](docs/product/1-0-release-charter.md) с 1.0 promise, explicit out-of-scope, ethical retention charter и governance baseline;
- link из [`README.md`](README.md) на новый charter как на отдельный документ уровня продукта.

### Changed

- `PLAN.md` теперь отмечает утверждёнными `1.0 promise`, `explicit out-of-scope`, `owner model / review rhythm` и ethical retention charter;
- `docs/reviews/phase-1-exit-gate.md` больше не держит promise/out-of-scope как незакрытый dependency и теперь ссылается на новый charter.

### Fixed

- обещание 1.0 и его red lines больше не размазаны только по roadmap-тексту; у команды появился отдельный approval-oriented source of truth для anti-drift решений.

## [0.46] - 2026-04-19

### Commit

- `worktree` — `feat: shift progression toward school mastery`

### Added

- domain rail [`src/modules/player/domain/school-mastery.ts`](src/modules/player/domain/school-mastery.ts) и тесты [`src/modules/player/domain/school-mastery.test.ts`](src/modules/player/domain/school-mastery.test.ts) для school mastery v0;
- persistence contract [`PlayerSchoolMastery`](prisma/schema.prisma) и миграция [`prisma/migrations/20260419124000_add_player_school_mastery/migration.sql`](prisma/migrations/20260419124000_add_player_school_mastery/migration.sql);
- review artifact [`docs/reviews/progression-rework-v1.md`](docs/reviews/progression-rework-v1.md) с первым staged решением по уходу от level-up stat allocation.

### Changed

- новые уровни больше не начисляют новые `unspentStatPoints`; старые allocation points остаются как compatibility layer для уже существующих профилей;
- победы с экипированной школой теперь двигают school mastery, а profile/main-menu copy и return focus смещены от “раскидай очки” к school-driven growth;
- profile keyboard скрывает старые stat-allocation кнопки, если у профиля уже нет legacy-очков для траты или сброса;
- battle snapshot теперь несёт active school mastery rank, чтобы школа могла менять бой не только статами, но и первым mastery payoff.

### Fixed

- progression loop больше не опирается только на рутинную раздачу +АТК/+ЗДР за уровень;
- уровни и return-goal copy теперь меньше толкают игрока в profile housekeeping и лучше поддерживают fantasy мастера конкретной школы.

## [0.47] - 2026-04-19

### Commit

- `worktree` — `fix: remove legacy stat points from new player start`

### Changed

- новые игроки теперь стартуют без fresh `unspentStatPoints`, а старая profile-ветка stat allocation остаётся только как compatibility path для уже существующих аккаунтов;
- bootstrap/env/docs больше не трактуют starting stat points как нормальную часть new-player creation;
- `PLAN.md`, `README.md`, `ARCHITECTURE.md` и `docs/reviews/progression-rework-v1.md` синхронизированы под эту cleanup-границу.

### Fixed

- progression rework больше не конфликтует с new-player bootstrap: игра перестала сначала отказываться от stat-point growth, а потом сразу же выдавать новые legacy-очки на старте.

## [0.48] - 2026-04-19

### Commit

- `worktree` — `feat: add starter school synergies`

### Added

- review artifact [`docs/reviews/starter-synergy-v1.md`](docs/reviews/starter-synergy-v1.md) с locked scope для first same-school synergy slice;
- battle regression coverage на Ember/Stone starter synergy windows.

### Changed

- `Пламя` теперь получает читаемую same-school starter synergy: после рунной техники в окно отката базовая атака сильнее дожимает просевшую цель;
- `Твердь` теперь получает читаемую same-school starter synergy: `Каменный отпор` из уже собранной стойки бьёт сильнее и лучше удерживает guard;
- `PLAN.md`, `README.md` и `ARCHITECTURE.md` синхронизированы под locked synergy scope для Пламени + Тверди.

### Fixed

- progression loop перестал выглядеть как набор разрозненных mastery-бонусов: у locked школ появился первый понятный `setup -> payoff` боевой паттерн без новых кнопок и без proc-web хаоса.

## [0.49] - 2026-04-19

### Commit

- `worktree` — `feat: refine rune hub quick selection`

### Added

- review artifact [`docs/reviews/rune-hub-ux-v1.md`](docs/reviews/rune-hub-ux-v1.md) с locked решением по rune hub: 5 рун на странице, single-slot loadout сейчас, extra slots только после отдельного review.

### Changed

- rune hub теперь ещё явнее разводит `выбрана` и `надета`, показывает один активный slot как текущее правило игры и прямо подсказывает, что дополнительные slots пока закрыты;
- player-facing copy в rune hub теперь лучше поддерживает быстрый выбор по слотам `1–5`, а keyboard-CTA на экипировку яснее различает `надеть` и `заменить`.

### Fixed

- rune interface меньше выглядит как технический список и сильнее работает как быстрый выбор стиля боя перед следующим PvE шагом.

## [0.50] - 2026-04-19

### Commit

- `worktree` — `refactor: remove legacy stat allocation completely`

### Changed

- legacy stat-allocation полностью удалена из runtime, persistence, VK-команд, profile UI и retry rails;
- `PlayerState`, repository mapping и Prisma schema больше не содержат `allocationPoints`, `unspentStatPoints` и `PlayerStatAllocation`;
- профиль теперь целиком описывает рост через школу рун, mastery и боевой стиль без transitional legacy copy.

### Fixed

- progression больше не раздваивается между новой school-mastery моделью и старой stat-allocation системой; у игры теперь один источник правды для роста.

## [0.51] - 2026-04-19

### Commit

- `d8cf28a` — `fix: finalize legacy stat cut cleanup`

### Fixed

- старые profile stat-команды теперь fail-closed как unknown command вместо скрытого fallback в удалённую систему;
- README и progression review больше не намекают, что legacy stat-allocation ещё жива как актуальный путь роста.

## [0.52] - 2026-04-19

### Commit

- `worktree` — `feat: unlock support rune slot via mastery`

### Added

- review artifact [`docs/reviews/support-rune-slot-v1.md`](docs/reviews/support-rune-slot-v1.md) с locked rules для первого support-slot slice;
- mastery-driven support-slot unlock rule: первая mastery-веха теперь открывает второй слот как bounded loadout breadth payoff.

### Changed

- rune hub и profile/loadout framing теперь различают `основу` и `поддержку`, а активная боевая руна остаётся только в primary slot;
- support-slot даёт половину статов выбранной руны без второй активной кнопки и без dual-cast semantics;
- equip/unequip flow, stale guards и player stat derivation теперь честно учитывают slot-aware loadout state.

### Fixed

- второй слот больше не остаётся только отложенной идеей в UI и плане: у игрока появился первый реальный loadout breadth payoff без перегруза боевого контура.

## [0.53] - 2026-04-19

### Commit

- `worktree` — `feat: deepen support rune battle impact`

### Added

- review artifact [`docs/reviews/support-rune-slot-v2.md`](docs/reviews/support-rune-slot-v2.md) с locked rules для passive-only support battle contribution;
- явное представление `supportRuneLoadout` в battle snapshot/presenter слое.

### Changed

- support-slot v2 теперь влияет на бой не только через полстатов, но и через ограниченный passive contribution для locked школ Пламени и Тверди;
- battle text теперь показывает поддержку как отдельный пассивный слой и прямо фиксирует, что второй активной кнопки пока нет;
- docs теперь явно разделяют current one-active readability rule и future multi-skill decision, чтобы текущий slice не выглядел permanent cap.

### Fixed

- support rune больше не выглядит как почти пустой слот: у игрока появился первый заметный вклад второй руны прямо в бою без dual-cast хаоса.

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
