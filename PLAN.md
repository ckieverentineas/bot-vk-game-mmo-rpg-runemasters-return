# PLAN — Runemasters Return

> Последовательный plan-to-1.0 checklist без сроков.
> Пункты отсортированы по зависимости и release value, а не по календарю.

Связанные документы:

- `docs/product/1-0-release-charter.md`
- `docs/product/deep-progression-rpg-vision.md`
- `ARCHITECTURE.md`
- `docs/telemetry/telemetry-plan.md`
- `RELEASE_CHECKLIST.md`
- `CHANGELOG.md`

Статусы:

- `[x]` done — завершено и уже вошло в рабочую базу проекта
- `[~]` current — активный фокус
- `[ ]` next — следующая обязательная очередь
- `[-]` deferred — сознательно не тащим сейчас

Правила:

- закрываем пункт только когда есть код, docs, tests и нужное evidence;
- новые задачи добавляем по зависимости и смыслу, а не по «срочности на словах»;
- если изменение влияет на UX, экономику, награды или replay-safety, обновляем связанные docs и release rails;
- не расширяем scope в social / PvP / live-ops, пока не доказан core PvE loop.

## Зафиксированные решения

- [x] `1.0` остаётся `PvE-first`, `schools-first` и без mandatory PvP.
- [x] Никаких pay-for-power, guilt UX, FOMO-давления и punitive retention loops.
- [x] Базовая атака должна оставаться полезной, а не быть одноразовым tutorial relic.
- [x] Редкость расширяет сборку, а не ломает баланс лотерейной raw power.
- [x] Exact-once semantics для наград, stale-action safety и persistence fallback не ослабляются ради удобства.
- [x] Архитектурные границы сохраняются: `domain` → `application` → `infrastructure` → `src/vk`.
- [x] Circles, async PvP и live-ops допускаются только после отдельного evidence review, а не как default roadmap promise.

## Уже собранная база

- [x] Переписан модульный TypeScript-каркас проекта с release rails.
- [x] Собран базовый loop: регистрация → tutorial → исследование → бой → руны.
- [x] В бою уже есть `basic attack`, рунные active skills, `defend`, enemy intents и event-first presentation.
- [x] Школы рун стали player-facing identity вместо внутреннего жаргона.
- [x] Tutorial и onboarding уже связывают путь `базовая атака → первая руна → школа → стиль боя`.
- [x] School mastery уже стала основной ранней осью роста вместо legacy stat-allocation.
- [x] Support-slot уже открывается через mastery milestone и остаётся bounded breadth без второй боевой кнопки.
- [x] Existing-player return flow уже получил `return recap v1` без guilt/FOMO copy.
- [x] `main menu`, `return recap`, `rune hub` и `battle result` уже используют единый school-aware next-goal слой.
- [x] Есть reward duplication rails, stale-action rejection, command-intent dedupe и concurrency coverage для critical flows.
- [x] Есть content validation, smoke tests, release preflight и telemetry v1 baseline.

## Текущий фокус

- [~] Превратить собранную базу в сильный vertical slice, который реально хочется продолжать, а не просто «потыкать и уйти».
  - [~] Зафиксировать стартовые school packages и их читаемые payoffs.
  - [ ] Дать минимум 2 по-настоящему сильные school-first PvE ветки с разными врагами, ритмом и payoff.
  - [ ] Ясно показывать, что именно игрок получил от новой редкости, новой руны или нового unlock'а.
  - [ ] Доказать через playtests и telemetry, что первый school payoff приходит быстро и читаемо.
  - [ ] Не расширять scope в social / PvP / live-ops, пока этот slice не доказан.

## Последовательный путь к релизу 1.0

### 1. Product lock для ближайшего релизного ядра

- [x] Зафиксировать `1.0 promise` и явный out-of-scope.
- [x] Зафиксировать ethical retention boundaries.
- [~] Заморозить starter school bible в практическом виде, а не только как идею.
- [ ] Заморозить rarity ladder и правила targeted chase.
- [ ] Ясно описать, что считается «сильным school payoff» в раннем loop.
- [ ] Держать явный cut-list для всего, что не усиливает core PvE / school loop.

### 2. Platform safety и runtime contracts

- [x] Ввести versioned battle/loadout/reward contracts.
- [x] Ввести canonical reward write-path и exact-once reward claim semantics.
- [x] Ввести stale-action rejection и replay-safe mutation rails.
- [x] Ввести command-intent dedupe для keyboard и legacy-text hot paths.
- [~] Поддерживать battle/loadout/reward compatibility fixtures и safe fallback policy при новых срезах.
- [ ] Довести backlog migration / persistence checks для критических состояний до системного набора.
- [ ] Держать duplication matrix и concurrency-critical cases как живые release rails, а не разовый аудит.

### 3. Onboarding, return и next-step clarity

- [x] Переписать welcome / tutorial copy в school-first framing.
- [x] Добавить `return recap v1`.
- [x] Добавить post-battle `Следующая цель`.
- [x] Вынести school-aware next-goal read-model в единый слой.
- [ ] Добавить ясный player-facing feedback: что именно изменила новая редкость или новая руна.
- [ ] Проверить, что игрок не тонет в терминах, кнопках и системном шуме.
- [ ] Сохранить VK UX компактным: короткие, actionable сообщения вместо длинных простыней.

### 4. Telemetry, validation и release evidence

- [x] Подготовить telemetry plan v1.
- [x] Подготовить content validator scope и release preflight rails.
- [x] Покрыть transport smoke и critical repository regressions.
- [x] Логировать `onboarding_started`, `loadout_changed`, `return_recap_shown`, `post_session_next_goal_shown`.
- [~] Использовать telemetry и playtests как evidence для ship / iterate / cut решений.
- [ ] Собирать регулярный обзор по onboarding clarity, school readability и loadout engagement.
- [ ] Не тащить новые product promises без evidence из runtime и playtests.

### 5. Vertical Slice proof

- [ ] Довести 2 strongest starter schools до действительно запоминающегося early-to-mid PvE loop.
  - [ ] Под эти школы собрать enemy roles, encounters и miniboss pressure points.
  - [ ] Дать targeted chase, который ощущается намеренным поиском, а не казино.
  - [ ] Дать первый midgame hook после раннего mastery / loadout payoff.
- [ ] Доказать, что первый school payoff приходит быстро и меняет решения игрока в бою.
- [ ] Доказать, что battle result и return flow создают желание продолжать, а не menu wandering.
- [ ] Держать награды, upgrade sinks и loadout growth читаемыми и честными.

### 6. Alpha shape

- [ ] Довести все 4 стартовые школы до release-shapable состояния.
- [ ] Расширить PvE path до midgame / proto-endgame без пустого провала между стартом и «когда-нибудь потом».
- [ ] Добавить quests / goals слой, который поддерживает короткие meaningful sessions.
- [ ] Укрепить economy, progression tuning и content throughput.
- [ ] Прогнать exploit / abuse sweep по всем новым reward-bearing loops.

### 7. Beta hardening

- [ ] Проверить реальную player readability и healthy retention без FOMO-механик.
- [ ] Добрать контентное покрытие, нужное для честного `1.0 promise`.
- [ ] Довести support / rollback / hotfix readiness.
- [ ] Рассматривать circles / social-lite только если core loop уже доказан и не просит срочного rework.
- [ ] Рассматривать optional async PvP только если он реально усиливает продукт и не ломает safety/scope.

### 8. Release 1.0 readiness

- [ ] Закрыть final content lock по школам, PvE path, экономике и return loop.
- [ ] Пройти полный `RELEASE_CHECKLIST.md` без оговорок.
- [ ] Убедиться, что `README`, `CHANGELOG`, `ARCHITECTURE` и player-facing promise совпадают с реально shipped состоянием.
- [ ] Подготовить launch monitoring и post-launch response plan без манипулятивного retention pressure.
- [ ] Закрыть или явно вырезать весь scope, который не доказывается к моменту релиза.

## Deferred / not now

- [-] Real-time PvP.
- [-] Open PvP / ganking.
- [-] Territory control, guild wars и обязательная соревновательная политика.
- [-] Свободная торговля и player market.
- [-] `8+` школ на старте.
- [-] Глубокий crafting simulator как отдельная игра внутри игры.
- [-] Mandatory attendance systems.
- [-] Жёсткие seasonal wipes.
- [-] Power-exclusive FOMO events, panic offers и guilt-driven comeback loops.
- [-] Любое расширение social / PvP / live-ops до доказательства core PvE loop.

## Long-horizon design direction

- [-] Зафиксирован aspirational GDD для более глубокой progression-centric версии Runemasters Return: `docs/product/deep-progression-rpg-vision.md`.
- [-] Этот vision-документ не является committed 1.0 scope, production promise или тихим расширением roadmap.
- [-] Любая система из него переносится в committed order только после отдельной product / tech / ethical-retention / exploit review оценки.

## Как обновлять этот план

- Переводим каждый пункт только между четырьмя состояниями: `[x]`, `[~]`, `[ ]`, `[-]`.
- Уже завершённое не удаляем: это история реального прогресса, а не мусор.
- Новые пункты добавляем в тот блок, к которому они относятся по зависимости.
- Если решение уже зафиксировано в source-of-truth документе, в плане держим короткую формулировку и ссылку, а не дублируем весь policy-текст.
- Если shipped slice меняет продуктовое обещание, UX, telemetry semantics или release behavior, синхронизируем связанные markdown-документы сразу.
