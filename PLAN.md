# PLAN — Runemasters Return

> Исполнительный roadmap проекта от текущего состояния до релиза 1.0 и после него.
> Текущая дата планирования: 2026-04-17.

## 1. Snapshot

- **Текущая фаза:** Foundation & Platform
- **Следующий контрольный рубеж:** Vertical Slice scope lock
- **Продуктовый вердикт:** `iterate`
- **Целевое окно релиза 1.0:** `H1 2028`
- **Общая уверенность:** `medium`
- **Главные риски:** различимость школ, пустой midgame, наградные дюпы, content throughput, social/PvP abuse
- **Связанные документы:** `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `RELEASE_CHECKLIST.md`

### 1.1 Current quarter objectives

| Objective | Measure of done | Owner role | Check date | Status |
|---|---|---|---|---|
| Зафиксировать обещание релиза 1.0 и явный out-of-scope | 1.0 promise и cut-list утверждены в плане | Producer / Product | 2026-05-01 | Done |
| Заморозить библиотеку стартовых школ и ladder редкости | school bible v1 и rarity ladder v1 согласованы | Game Design + Balance | 2026-05-15 | In progress |
| Зафиксировать loadout/reward/schema contracts | есть контрактный пакет и test-plan на миграции | Gameplay / Platform | 2026-05-31 | Planned |
| Зафиксировать onboarding / return UX и telemetry frame | UX map и telemetry plan утверждены | Content / UX | 2026-06-15 | Planned |
| Собрать abuse/dependency matrix для Vertical Slice | blocker list, dependency table и concurrency backlog готовы | QA / Release | 2026-06-30 | Planned |

### 1.2 Next 30 / 60 / 90 days

#### By 2026-05-17

- [x] Утвердить 1.0 promise и explicit out-of-scope
- [ ] Утвердить стартовые школы и ruleset редкости
- [x] Утвердить owner model и review rhythm

#### By 2026-06-17

- [ ] Заморозить `SchoolDefinition`, `LoadoutSnapshot`, `RewardIntent`, `RewardLedger`
- [ ] Подготовить onboarding / return UX brief
- [ ] Подготовить telemetry plan и abuse matrix v1

#### By 2026-07-17

- [ ] Подготовить migration fixtures и concurrency test backlog
- [ ] Подготовить content pipeline plan и validators scope
- [ ] Пройти mid-quarter risk review по готовности Vertical Slice

### 1.3 Current blockers and watchlist

| Blocker / risk | Impact | Owner role | Target resolution | Status |
|---|---|---|---|---|
| Библия стартовых школ ещё не заморожена | Нельзя честно начать Vertical Slice content production | Game Design | 2026-05 | At risk |
| Контракты loadout/reward/schema ещё не стабилизированы | Высокий риск rework в progression и save-state | Gameplay / Platform | 2026-05 | At risk |
| Нет финального dependency map для Q2–Q3 | Скрытые блокеры могут сорвать scope lock | Producer / Product | 2026-05 | In progress |
| Telemetry frame уже описан, но evidence ritual ещё не обкатан на регулярных review | Будет трудно принимать cut/go решения только по живым сигналам, а не по документам | Release / Analytics | 2026-06 | In progress |
| Abuse matrix для social/PvP ещё не собрана | Есть риск обещать unsafe scope слишком рано | QA / Release | 2026-06 | Planned |

## 2. Как пользоваться этим планом

### 2.1 Статусы

- `Not started` — ещё не начинали
- `Planned` — входит в утверждённый roadmap
- `In progress` — активная фаза работы
- `At risk` — есть риск по срокам, качеству или зависимости
- `Blocked` — ждёт решения/зависимости
- `Done` — завершено и прошло definition of done
- `Deferred` — сознательно перенесено
- `Cut` — сознательно вырезано из текущего объёма

### 2.2 Формат дат

- Используем только **примерные окна**, а не фальшивую точность.
- Примеры: `Q2 2026`, `Q4 2026`, `H1 2027`, `H2 2028`.
- Сдвиг на одно окно допустим, если предыдущий exit gate не закрыт.

### 2.3 Правила чекбоксов

- `[x]` — реально доставлено и проверено
- `[ ]` — ещё не выполнено
- Не уходим глубже **трёх уровней вложенности**
- Фичу нельзя считать закрытой, пока не закрыты её тесты, UX, docs и abuse-check при наличии наград

### 2.4 Owner model

Для roadmap используются **роли-владельцы**, даже если фактически часть ролей совмещается одним человеком.

- **Producer / Product** — приоритеты, scope, go/no-go, cut/defer решения
- **Game Design** — школы, fantasy, encounter roles, progression value
- **Gameplay / Platform** — доменные контракты, data safety, tooling, migration stability
- **Content / UX** — onboarding, return UX, player-facing copy, discoverability
- **Balance** — школы, economy, PvE/PvP power curve, anti-dominance tuning
- **QA / Release** — exploit sweep, smoke coverage, release gates, rollback readiness

Правило:

- у каждого committed deliverable должен быть **primary owner role**;
- у каждого phase gate должен быть **review owner**;
- если owner не определён, deliverable не считается committed.

### 2.5 Scope classes

- **Committed** — обязано войти в текущую фазу или релизный scope
- **Stretch** — делаем только если committed часть зелёная и нет риска для gate
- **Optional / Later** — идея или усиление, не влияющее на ближайший gate

Правило:

- ближний горизонт (`текущий квартал`, `следующие 90 дней`, `активная фаза`) должен быть в основном `Committed`;
- дальний горизонт допускает outcome-driven формулировки без ложной точности.

### 2.6 Review rhythm

#### Weekly checkpoint

- что сдвинулось;
- что проскользнуло по сроку;
- новые блокеры;
- какие решения нужны на этой неделе;
- RAG-статус по потокам: gameplay, content, tech, UX, telemetry, QA, release.

#### Monthly production review

- phase health;
- evidence gained;
- scope changes proposed;
- новые зависимости и риски;
- кандидаты на cut/defer;
- go/no-go recommendation по следующему рубежу.

#### Phase exit review

- planned exit criteria vs actual evidence;
- открытые блокеры;
- принятный quality debt;
- deferred items;
- решение: `go` / `go with cuts` / `no-go`.

### 2.7 Update rule

- `PLAN.md` обновляется минимум **раз в неделю** в активной фазе;
- phase status обновляется на monthly review;
- чекбокс нельзя закрывать “по ощущению” — нужен результат и evidence;
- если пункт два review-периода подряд в `At risk`, он уходит в cut/defer review.

## 3. Locked product direction

### 3.1 Проблема игрока

Большинство chat-based RPG быстро превращаются в:

- гринд без личности;
- ложный выбор между почти одинаковыми билдами;
- ежедневки ради галочки;
- гонку цифр без сильной fantasy-оси.

Runemasters Return должен решать это через **школы рун как главную build-ось**, короткие, но умные сессии и честный возврат в игру без давления и FOMO.

### 3.2 Target fantasy

Игрок — **мастер школы рун**, который:

- строит узнаваемый стиль боя;
- читает намерения врага и отвечает осмысленно;
- собирает рунную сборку, а не просто больше цифр;
- растёт в силе, знании, репутации и вкладе в мир;
- возвращается ради новых решений, а не из-за страха потери.

### 3.3 Неподвижные продуктовые правила

- **Basic attack is evergreen** — базовая атака всегда полезна
- **Schools first** — школа рун = главная identity-ось
- **Rarity expands loadout breadth** — редкость расширяет сборку, а не ломает баланс голой силой
- **Synergy is earned depth** — синергии открываются позже как награда за понимание системы
- **PvE-first** — PvE остаётся главным ядром игры
- **Social is asynchronous by default** — социальный слой строится вокруг асинхронной кооперации
- **PvP is optional and late** — PvP не обязателен для core progression
- **Ethical retention only** — без подлых психологических ловушек и FOMO-механик

### 3.4 Player-facing термины

Используем:

- **базовая атака**
- **школа рун**
- **рунная техника / рунный навык**
- **редкость расширяет сборку**
- **стиль боя**

Не используем как player-facing язык:

- `архетип`
- `lane`
- `proc`
- `contract`
- `synergy engine`

## 4. Ethical guardrails и red lines

### 4.1 Что для нас допустимо

- weekly-flexible прогресс вместо жёстких daily-цепей;
- catch-up для вернувшихся игроков;
- архив сезонных хроник и повтор контента;
- косметический и статусный престиж;
- асинхронные совместные цели;
- награды за mastery, curiosity, belonging и expression.

### 4.2 Что запрещено

- hard streak reset;
- “пропустил день — потерял лучшую награду”;
- узкие power-окна, где пропуск делает аккаунт слабее навсегда;
- guilt UX и panic messaging;
- коллективные штрафы за отсутствие игрока;
- near-miss/gacha-психология как основа chase;
- mandatory PvP ради базовой силы;
- reward-структуры, где альты выгоднее честной игры.

## 5. Scope frame

### 5.1 В scope для 1.0

- core PvE loop с strong school identity;
- 4 стартовые школы в сильном состоянии;
- rarity-based loadout growth;
- targeted chase по школам;
- midgame и proto-endgame активности;
- circles / social-lite в асинхронном формате — только после отдельного evidence review;
- optional async PvP v1 — только после отдельного evidence review;
- ethical season-chronicle framework;
- стабильные release rails, tests, telemetry и anti-abuse основы.

### 5.2 Явно вне scope для 1.0

- real-time PvP;
- open PvP / ganking;
- рынок между игроками и свободная торговля;
- territory control и guild wars;
- 8+ школ на старте;
- глубокий crafting simulator;
- mandatory attendance systems;
- жесткие seasonal wipes;
- power-exclusive FOMO events.

### 5.3 Post-launch кандидаты

- школы второй волны;
- doctrines / advanced mastery;
- draft / limited PvP;
- world-state metagame;
- deeper cooperative rituals;
- curated long-tail prestige systems.

## 6. Roadmap overview

| Phase | Window | Primary outcome | Status | Exit gate |
|---|---|---|---|---|
| Shipped foundation | done | Базовый playable combat + tutorial + rune slice | Done | Уже в продукте |
| Foundation & Platform | Q2–Q3 2026 | Зафиксировать правила игры и платформенные контракты | In progress | Vertical Slice scope lock |
| Vertical Slice | Q4 2026 | Доказать сильный school-first early-to-mid loop | Planned | Slice fun + readability + stability |
| Closed Alpha | H1 2027 | Собрать feature shape релиза 1.0 | Planned | Alpha gate |
| Open Beta / Soft Launch | H2 2027 | Отладить onboarding, economy, social и live-ops v1 | Planned | Beta / soft-launch gate |
| Release 1.0 | H1 2028 | Выпустить честную PvE-first social build-RPG | Planned | Launch gate |
| Post-launch Year 1 | H2 2028–H1 2029 | Углубить mastery, контент и social systems без потери ясности | Planned | Quarterly reviews |
| Year 2+ Direction | H2 2029+ | Расширять мир и долгую ценность без drift в exploit/FOMO | Planned | Annual strategy review |

### 6.1 Critical dependency map

| Dependency | Почему критично | Нужна к фазе | Owner role | Target | Status | Fallback |
|---|---|---|---|---|---|---|
| Библия стартовых школ и rarity ladder | Без неё content и balance будут переделываться | Vertical Slice | Game Design + Balance | 2026-05 | In progress | сократить количество школ в slice |
| `LoadoutSnapshot` + `RewardLedger` + schema versioning | Без этого высокий риск rework и unsafe saves | Vertical Slice / Alpha | Gameplay / Platform | 2026-06 | Planned | уменьшить loadout breadth в slice |
| Content pipeline и validators | Без этого скорость производства контента не будет проверяема | Alpha | Gameplay / Platform + Content | 2026-08 | Planned | урезать объём контента до узкого проверяемого набора |
| Telemetry + dashboards | Без evidence нельзя принимать beta / launch решения | Alpha / Beta | Release / Analytics | 2026-08 | Planned | сузить аудиторию тестов и задержать wider rollout |
| Migration harness и compatibility fixtures | Без этого Beta и 1.0 рискуют сломать сейвы | Alpha / Beta | Gameplay / Platform + QA | 2026-08 | Planned | заморозить save-breaking изменения раньше |
| Circles safety rails | Без этого social launch станет abuse surface | Beta / 1.0 | Gameplay / Platform + QA | 2027-06 | Planned | ship circles как минимальный ritual/profile layer |
| PvP normalization + anti-abuse | Без этого optional PvP подорвёт честность игры | Beta / 1.0 | Balance + QA | 2027-09 | Planned | ship 1.0 без ranked PvP |
| Live-ops archive / compensation rules | Без этого сезоны будут unsafe и токсичны | Beta / 1.0 | Producer / Release | 2027-10 | Planned | ship 1.0 без deep chronicle rewards |

## 7. Global definition of done

Любой существенный пункт roadmap считается закрытым только если:

- [ ] Доменные правила реализованы в `domain` / `application`, а не размазаны по transport
- [ ] Есть automated tests на happy path и critical edge cases
- [ ] Player-facing copy проверена на ясность
- [ ] Добавлена telemetry, если изменение влияет на опыт игрока или экономику
- [ ] Пройден exploit/abuse review, если цикл выдаёт награды, прогресс или социальную власть
- [ ] Обновлены `PLAN.md`, `README.md`, `CHANGELOG.md`, `ARCHITECTURE.md` или `RELEASE_CHECKLIST.md`, если это нужно по изменению
- [ ] `npm run check` и `npm run release:preflight` проходят
- [ ] Нет незакрытого launch-blocking dependency

## 8. Global release gates

### 8.1 Gameplay gate

- [ ] Игрок может словами объяснить, чем одна школа отличается от другой
- [ ] Базовая атака остаётся полезной в early/mid game
- [ ] Редкость ощущается как рост вариантов, а не как обязательный power cliff
- [ ] Есть минимум один school-driven reason to return after a session

### 8.2 Technical gate

- [ ] Battle state детерминированно тестируется и восстанавливается
- [ ] Награды выдаются через idempotent flow
- [ ] Save/load/migration policy формализована и проверяется тестами
- [ ] Rollback/hotfix path описан и хотя бы один раз репетирован

### 8.3 Economy and abuse gate

- [ ] Нет известных duplicate reward путей в shipped scope
- [ ] Нет salvage-positive или reroll-positive печатных петель
- [ ] PvP/social rewards защищены от repeated-opponent и alt abuse
- [ ] Resource faucets/sinks наблюдаемы и интерпретируемы

### 8.4 UX gate

- [ ] Первый school payoff приходит быстро и читаемо
- [ ] Игрок понимает, что делать дальше после первой, третьей и седьмой сессии
- [ ] В UI нет необходимости читать длинные системные простыни ради базовых решений
- [ ] Return UX не использует guilt/FOMO copy

### 8.5 Release / ops gate

- [ ] Monitoring, alerts, support runbooks и known-issues workflow готовы
- [ ] Feature flags и staged rollout доступны для high-risk systems
- [ ] Есть audit trail для наград, важной экономики и PvP settlement
- [ ] Команда способна поддерживать cadence без постоянного crunch

### 8.6 Scope control and cut rules

- [ ] Beta защищает релиз, а не мечту: всё, что не критично для core loop, onboarding, stability, save integrity и ethical live-ops, может быть вырезано
- [ ] Если у фичи нет измеримого success criterion, она не считается committed scope
- [ ] Если критическая зависимость ушла в `At risk`, все зависящие stretch-пункты автоматически идут в cut review
- [ ] Если фича не доказана playtest/telemetry evidence к Beta content lock, она переносится
- [ ] Если operational risk выше player value для 1.0, фича переносится
- [ ] Если milestone slip по critical path больше 2 недель, запускается обязательный cut/defer review

## 9. Metrics framework

### 9.1 Experience metrics

- tutorial completion rate
- time to first school payoff
- time to first intentional loadout change
- понятность next-step после сессии
- build diversity по школам и rarity band

### 9.2 Health metrics

- PvE encounter completion rate по band'ам сложности
- source/sink ratio по каждой валюте
- dry streak length по targeted chase
- доля игроков с хотя бы одной рабочей альтернативной сборкой
- midgame progression pace

### 9.3 Risk metrics

- duplicate reward incidents
- negative inventory / stale state / recovery failures
- exploit reports by system
- win-trade / repeated-opponent anomalies
- guild/social collusion signals

### 9.4 Review cadence

- до Beta — ежемесячный roadmap review
- во время Beta / soft launch — каждые 2 недели
- после 1.0 — ежеквартально по контенту, балансу, retention и ethics

### 9.5 Indicative target bands

- first school payoff: **до 15 минут** у нового игрока
- first intentional loadout change: **не позже 3-й значимой сессии**
- validated distinct school fantasies before Beta: **минимум 3**, лучше 4
- soft-launch retention targets: **D1 >= 35%**, **D7 >= 12%**, **D30 = 4–6%** как ориентир, а не догма
- high-end school concentration: ни одна школа не должна устойчиво занимать **>45%** без намеренного временного теста или объяснимой причины

## 10. Already shipped foundation

### 10.1 Базовый продуктовый слой

- [x] tutorial-first старт
- [x] keyboard-first VK flow
- [x] tutorial reward loop доводит до первой meaningful rune payoff
- [x] post-tutorial objective layer

### 10.2 Combat foundation

- [x] battle snapshot устойчив к recovery и finalize
- [x] active battle idempotency уже защищена
- [x] первая playable rune action реально влияет на бой
- [x] `защита` как universal utility
- [x] enemy intent для telegraphed heavy strike
- [x] enemy intent для anti-guard pattern
- [x] compact event-first battle presentation

### 10.3 Rune / build foundation

- [x] paged rune hub без листания по одной руне
- [x] player-facing язык уже сдвинут в сторону школ рун
- [x] Твердь получила первый полный пакет passive + active identity
- [x] adaptive difficulty уже заменяет ручной выбор угрозы

### 10.4 Release rails

- [x] `npm run check`
- [x] `npm run content:validate`
- [x] `npm run release:preflight`
- [x] smoke tests на ключевые player journey
- [x] CI и release discipline

## 11. Phase 1 — Foundation & Platform

- **Window:** `Q2–Q3 2026`
- **Status:** `In progress`
- **Objective:** зафиксировать правила игры, платформенные контракты, безопасность наград и scope Vertical Slice.
- **Target exit:** `конец Q3 2026`
- **Confidence:** `medium`
- **Primary owner:** `Producer / Product + Gameplay / Platform`
- **Support owners:** `Game Design`, `Balance`, `Content / UX`, `QA / Release`
- **Entry criteria:** shipped foundation уже существует и базовый курс школы/редкости принят
- **Why now:** без замороженных правил и контрактов любой следующий slice будет дорогим rework
- **Primary risks:** overdesign, scope drift, слишком ранние обещания social/PvP, отсутствие контрактной дисциплины
- **Go / no-go review date:** `2026-09-30`

### 11.0 Execution checkpoints

- [x] **Late April 2026:** заморозить 1.0 promise, owner model и review rhythm
- [ ] **May 2026:** заморозить school bible, rarity ladder и scaling role базовой атаки
- [ ] **June 2026:** заморозить `SchoolDefinition`, `LoadoutSnapshot`, `RewardIntent`, `RewardLedger`, telemetry brief
- [ ] **July 2026:** собрать duplication matrix, concurrency backlog и migration fixtures v1
- [ ] **August 2026:** собрать content pipeline plan, validators scope и dependency review
- [ ] **September 2026:** провести Vertical Slice scope lock, cut review и phase exit review

### 11.1 Product lock

- [x] Зафиксировать обещание релиза 1.0
  - [x] сформулировать 1.0 как PvE-first social build-RPG
  - [x] утвердить список explicit out-of-scope для 1.0
  - [x] запретить drift в FOMO/P2W/mandatory PvP
- [ ] Зафиксировать библиотеку стартовых школ
  - [ ] Школа Пламени — pressure / burst / risk-reward
  - [ ] Школа Тверди — стойкость / counter / stability
  - [ ] Школа Бури — tempo / chaining / disruption
  - [ ] Школа Прорицания — intent reading / setup / payoff
- [ ] Зафиксировать overlap / uniqueness rules между школами
  - [ ] определить, где школы могут делить инструменты
  - [ ] определить, где школы обязаны различаться по решениям в бою
- [ ] Зафиксировать ruleset редкости
  - [ ] common = базовая школьная идентичность
  - [ ] uncommon = первая вариативность
  - [ ] rare = active + passive breadth
  - [ ] epic = второй слой depth, а не x2 цифры
  - [ ] legendary = keystone/capstone, а не mandatory auto-win
- [x] Зафиксировать ethical retention charter
  - [x] no hard streak resets
  - [x] no absence punishment
  - [x] no exclusive power windows
  - [x] return via curiosity, mastery, belonging, expression

### 11.2 Domain platform

- [x] Выделить и стабилизировать `SchoolDefinition`
- [x] Выделить и стабилизировать `LoadoutSnapshot`
- [x] Выделить `RewardIntent` и `RewardLedger`
- [ ] Разделить source-of-truth state и derived read models
- [ ] Ввести schema versioning для:
  - [ ] player state
  - [x] battle snapshot
  - [x] loadout state
  - [x] reward claim records
- [x] Подготовить compatibility test fixtures для будущих миграций

### 11.3 Combat / progression rules

- [x] Зафиксировать progression rework v1: новые уровни больше не дают новые stat points как основной рост
  - [x] level-up stat allocation полностью убрана из runtime и persistence-контрактов
  - [x] school mastery v0 растёт за победы с экипированной школой
  - [x] первый mastery payoff меняет боевое поведение, а не даёт ещё один голый stat bump
  - [x] новые игроки стартуют без новых stat points и без profile-команд старой stat-allocation системы
- [ ] Зафиксировать scaling role базовой атаки по early / mid / late bands
- [ ] Зафиксировать skill budget в бою
  - [ ] сколько активных рунных кнопок допустимо в 1.0
  - [ ] какой рост сложности живёт pre-battle, а не in-battle
- [x] Зафиксировать same-school starter synergy rules
  - [x] setup -> payoff без proc-web хаоса
  - [x] без infinite resource loops
  - [x] locked scope v1: только Пламя + Твердь через `docs/reviews/starter-synergy-v1.md`
- [ ] Зафиксировать targeted chase philosophy
  - [ ] школа должна быть targetable
  - [ ] targeted chase не должен становиться казино
- [ ] Зафиксировать валюты и sinks v1
  - [ ] повседневная валюта
  - [ ] upgrade essence / shards
  - [ ] school sigils
  - [ ] prestige currency без core power dependency

### 11.4 UX / content / instrumentation

- [x] Переписать school-first onboarding framing
  - [x] объяснить attack -> school -> rarity -> next goal
  - [x] не использовать внутренний жаргон
- [x] Зафиксировать формат next-goal messaging после сессии
- [x] Зафиксировать return-recap UX без guilt/FOMO copy
- [x] Подготовить content pipeline plan для:
  - [x] schools
  - [x] enemies
  - [x] encounters
  - [x] quests
  - [x] season chronicle configs
- [x] Подготовить telemetry plan
  - [x] onboarding clarity
  - [x] school pick rates
  - [x] loadout change rates
  - [x] economy health
  - [x] exploit signals

### 11.5 QA / abuse rails

- [x] Собрать reward duplication matrix
- [x] Ввести stale action rejection rules
- [x] Зафиксировать repeated command / retry handling
  - [x] battle mutation retries и stale overwrite rules
  - [x] keyboard battle action same-intent dedupe и canonical replay
  - [x] legacy text battle action same-intent dedupe через server-owned message ids
  - [x] rune mutation same-intent dedupe через keyboard payloads
  - [x] broader non-rune / legacy-text multi-budget dedupe
    - [x] profile stat allocation / reset same-intent dedupe через keyboard payloads
    - [x] rune equip / unequip same-intent dedupe и stale loadout recovery через keyboard payloads
    - [x] legacy text same-intent dedupe для rune craft / reroll / destroy через server-owned message ids
    - [x] legacy text same-intent dedupe для profile stat allocation / reset через server-owned message ids
    - [x] legacy text same-intent dedupe для rune equip / unequip через server-owned message ids
    - [x] skip tutorial / return to adventure same-intent dedupe через keyboard payloads и legacy text ids
    - [x] explore location same-intent dedupe через keyboard payloads и legacy text ids
    - [x] enter tutorial mode same-intent dedupe через keyboard payloads и legacy text ids
    - [x] delete confirm same-intent dedupe через keyboard payloads и account-scoped delete receipt
    - [x] legacy text rune navigation same-intent dedupe для rune cursor / page / slot commands через server-owned message ids
    - [x] remaining supported non-guarded text commands audited: они read-only и не требуют replay rail в scope v1
- [x] Зафиксировать RNG authority rules для reroll / drop / craft
- [x] Подготовить alt-account / guild / PvP abuse checklist
- [x] Добавить обязательные concurrency tests на critical use cases

### 11.6 Exit gate for Phase 1

- [ ] Пиллары продукта согласованы и не конфликтуют друг с другом
- [ ] Platform contracts готовы к Vertical Slice
- [x] Vertical Slice scope заперт и не расползается
  - [x] source-of-truth review зафиксирован в `docs/reviews/phase-1-exit-gate.md`
  - [x] committed Vertical Slice сужен до одного polished early-to-mid PvE journey
- [x] High-risk out-of-scope вынесен из ближайшего delivery order
  - [x] social-lite / PvP / trading / prestige вынесены из near-term committed scope
  - [x] Burya / Divination и broad boss/trials breadth перенесены за пределы первого Vertical Slice proof

## 12. Phase 2 — Vertical Slice

- **Window:** `Q4 2026`
- **Status:** `Planned`
- **Objective:** доказать, что игра удерживает не только первым боем, но и первым настоящим school-driven midgame slice.
- **Target exit:** `конец Q4 2026`
- **Confidence:** `medium`
- **Primary owner:** `Game Design + Gameplay / Platform`
- **Support owners:** `Balance`, `Content / UX`, `QA / Release`
- **Entry criteria:** закрыт Phase 1 exit gate
- **Why now:** нужно доказать fun, readability и production viability до роста системной сложности
- **Primary risks:** школы окажутся слишком похожими, loadout complexity перегрузит UX, контент будет производиться медленнее плана
- **Go / no-go review date:** `2026-12-20`

### 12.0 Execution checkpoints

- [ ] **October 2026:** довести Пламя + Твердь до locked school-v1 proof и собрать 2 ранних PvE bands
- [ ] **November 2026:** довести первый rarity/loadout breakpoint, 2 elite archetypes и 1 miniboss
- [ ] **December 2026:** провести playtests, tuning pass, docs update и review на расширение slice только после evidence

### 12.1 Launch schools v1

- [ ] Довести Пламя до полного school-v1 пакета
  - [ ] понятная passive identity
  - [ ] активная техника с читаемым риском/наградой
  - [ ] минимум один school-specific chase reward
- [ ] Довести Твердь до релизного school-v1 пакета
  - [ ] укрепить counter / guard fantasy
  - [ ] убедиться, что Твердь не сводится к passive-only роли
  - [ ] добавить encounter, где Твердь особенно читается
- Deferred after first Vertical Slice proof:
  - Буря как полный school-v1 package;
  - Прорицание как полный school-v1 package.

### 12.2 PvE slice

- [ ] Собрать один polished early-to-mid journey
  - [ ] onboarding -> первый meaningful school choice tease
  - [ ] ранний путь до первого build breakpoint
  - [ ] midgame цель на 3–5 сессий
- [ ] Обновить ранние регионы под school-first loop
  - [ ] минимум 2 ранних PvE bands с разными tactical asks
  - [ ] минимум 2 элитных encounter archetypes
  - [ ] минимум 1 мини-босс
- Deferred after first Vertical Slice proof:
  - school trials v1;
  - broad boss slice beyond первого мини-босса.

### 12.3 Rarity and loadout slice

- [x] Ввести pre-battle loadout decisions v1
  - [x] mastery-веха открывает support-slot как первый breadth payoff
  - [x] основа остаётся единственным источником активной рунной кнопки
  - [x] support-slot даёт только половину статов и не вводит вторую боевую кнопку
- [ ] Привязать rarity growth к breadth, а не к stat inflation
- [ ] Добавить targeted school drops / source family для locked slice
- [x] Ввести первые same-school starter synergies
- [ ] Проверить, что higher rarity не убивает low-rarity relevance
- Deferred after first Vertical Slice proof:
  - расширять rune slot system дальше support-slot v1 только после отдельного contract review;
  - не включать 3+ слота или multi-action loadout до loadout clarity proof.

### 12.4 UX and return motivation

- [ ] Обновить rune hub вокруг сравнения школ и ближайших целей
  - [x] быстрый выбор 5 рун на странице
  - [x] явная индикация `выбрана / надета`
  - [x] основа / поддержка читаются отдельно, а active combat rune остаётся очевидной
  - [x] support-slot открывается позже через mastery, но не создаёт вторую боевую кнопку
- [ ] Показывать игроку, что именно дала новая редкость
- [ ] После сессии показывать 2–3 честные next goals
- [ ] Добавить return recap для игрока после перерыва
- [ ] Проверить, что игрок не тонет в терминах и кнопках

### 12.5 Social-lite slice

- Deferred after first Vertical Slice proof:
  - profile read model с видимой школой;
  - сигнатурная сборка в профиле / preview;
  - shared ritual или иная school-driven social goal;
  - social-lite validation как отдельный post-slice decision.

### 12.6 Validation tasks

- [ ] Провести внутренние playtests по школам
- [ ] Провести school differentiation review
- [ ] Провести economy sanity simulation
- [ ] Провести UX/copy pass на first session и first return

### 12.7 Exit gate for Phase 2

- [ ] Игроки без подсказки могут описать разницу между стартовыми школами
- [ ] Игроки осознанно меняют loadout под encounter
- [ ] Slice стабилен по save/load/recovery
- [ ] Есть сильный аргумент, почему игра интересна после первой недели

## 13. Phase 3 — Closed Alpha

- **Window:** `H1 2027`
- **Status:** `Planned`
- **Objective:** собрать feature shape релиза 1.0, закрыть основные системные дыры и доказать, что midgame / proto-endgame живут.
- **Target exit:** `конец H1 2027`
- **Confidence:** `medium`
- **Primary owner:** `Producer / Product + Gameplay / Platform`
- **Support owners:** `Game Design`, `Balance`, `Content / UX`, `QA / Release`
- **Entry criteria:** Vertical Slice доказал school readability и build-driven return motivation
- **Why now:** после этого этапа 1.0 scope должен стать честным и замороженным
- **Primary risks:** midgame не удерживает, economy leaks, quest platform нестабильна, content throughput не выдерживает 1.0 ambition
- **Go / no-go review date:** `2027-06-30`

### 13.0 Execution checkpoints

- [ ] **Q1 2027:** quest platform v1, новые регионы, dungeon / gauntlet prototypes, dashboards v1
- [ ] **Q2 2027:** alpha content fill, exploit sweep, economy hardening и freeze релизной feature shape

### 13.1 Progression and build game

- [ ] Ввести school mastery tracks v1
- [ ] Расширить rune slot system beyond support-slot v1
  - [ ] решить, нужен ли 3-й слот или richer support rules после playtest evidence
  - [ ] сохранить один очевидный primary active rune, если бой всё ещё single-button
  - [ ] проверить save/load и battle contracts до расширения дальше support-slot v1
- [ ] Ввести codex / archive v1
- [ ] Ввести первый prestige layer без mandatory power cliff
- [ ] Настроить respec / adjustment rules без чрезмерного regret
- [ ] Добавить долгие build goals на 1–2 недели игры

### 13.2 PvE content expansion

- [ ] Довести контент до 1.0 alpha shape
  - [ ] 3–4 полноценных региона
  - [ ] enemy families с разными tactical asks
  - [ ] boss families и rematch hooks
- [ ] Ввести expedition / dungeon v1
  - [ ] lifecycle run state
  - [ ] abandon / fail / reward protection
  - [ ] encounter variety внутри раннего dungeon loop
- [ ] Ввести tower / gauntlet v1
  - [ ] escalating challenge
  - [ ] mutators
  - [ ] non-toxic failure loop

### 13.3 Quest and goal platform

- [ ] Ввести quest platform v1
- [ ] Добавить school questlines
- [ ] Prototype exploration events beyond combat
  - [ ] 2–3 небойовых события с явным выбором
  - [ ] лёгкие persistent consequences / `след решений в исследовании` без глобальной оси добра/зла
  - [ ] проверить, усиливают ли выборы school identity, variety сессий и return motivation
  - [ ] отдельно решить позже, нужна ли вообще глобальная шкала, вместо обещания её заранее
- [ ] Добавить short-term / weekly goals без daily coercion
- [ ] Добавить targeted chase objectives
- [ ] Проверить, что цели усиливают сборку, а не превращаются в chores

### 13.4 Economy and balance hardening

- [ ] Собрать source/sink dashboards
- [ ] Проверить отсутствие salvage-positive loops
- [ ] Проверить отсутствие obvious reroll-positive loops
- [ ] Проверить, что одна школа не доминирует как лучший фарм-маршрут
- [ ] Настроить dry streak relief / token fallback, если нужно

### 13.5 Tooling and content platform

- [ ] Добавить validators для schools / encounters / quests / rewards
- [ ] Подготовить battle / reward / progression simulation tools
- [ ] Подготовить feature flags для risky systems
- [ ] Подготовить admin / recovery tooling для support и hotfix cases

### 13.6 QA / exploit sweep

- [ ] Добавить long-form deterministic scenario tests
- [ ] Добавить migration fixture coverage
- [ ] Провести full exploit sweep на progression / loot / rewards
- [ ] Провести destructive manual playtest pass
- [ ] Зафиксировать список known alpha risks

### 13.7 Exit gate for Phase 3

- [ ] Нет blocker-класса багов по наградам и прогрессии в alpha scope
- [ ] Midgame и proto-endgame дают reason to return
- [ ] 1.0 feature shape заморожен до Beta
- [ ] Beta scope и cut-list зафиксированы заранее

## 14. Phase 4 — Open Beta / Soft Launch

- **Window:** `H2 2027`
- **Status:** `Planned`
- **Objective:** отладить onboarding, retention, economy, circles, optional PvP и ethical live-ops перед 1.0.
- **Target exit:** `конец H2 2027`
- **Confidence:** `medium-low`
- **Primary owner:** `Producer / Release + QA / Release`
- **Support owners:** `Gameplay / Platform`, `Game Design`, `Balance`, `Content / UX`
- **Entry criteria:** alpha scope собран и 1.0 must-have shape заморожен
- **Why now:** Beta должна отсеять unsafe scope и доказать, что live game выдержит реальных игроков
- **Primary risks:** onboarding по-прежнему мутный, circles создают coercion, PvP провоцирует abuse, live-ops слишком дорог в поддержке
- **Go / no-go review date:** `2027-12-15`

### 14.0 Execution checkpoints

- [ ] **Q3 2027:** circles v1, onboarding/return clarity pass, async duel contract, season chronicle template draft
- [ ] **Q4 2027:** soft launch, staged rollout, support tooling, launch cut review и final scope lock для 1.0

### 14.1 Onboarding and return clarity

- [ ] Финальный pass по first-session clarity
- [ ] Финальный pass по first-week goals
- [ ] Ввести return recap v1 для вернувшихся игроков
- [ ] Проверить, что игра объясняет прогресс и next goals без стен текста

### 14.2 Circles and social systems v1

- [ ] Ввести circles v1
  - [ ] join / leave / basic roles
  - [ ] contribution caps
  - [ ] no absence punishment
  - [ ] shared ritual board
- [ ] Ввести mentorship / novice support v1
- [ ] Ввести social showcases для профилей и сигнатурных сборок
- [ ] Проверить, что circles не превращаются в attendance trap

### 14.3 Optional PvP v1

- [ ] Ввести async duel snapshot contract
- [ ] Ввести normalization / bracket rules
- [ ] Ограничить reward value PvP относительно core PvE progression
- [ ] Ввести repeated-opponent caps
- [ ] Ввести anti-win-trade / anti-smurf heuristics
- [ ] Подготовить cosmetic / prestige reward ladder

### 14.4 Live-ops v1

- [ ] Подготовить season chronicle template
- [ ] Подготовить archive / rerun / catch-up rules
- [ ] Подготовить ethical copy rules для событий и возврата
- [ ] Подготовить compensation playbooks и event rollback rules
- [ ] Проверить, что сезон даёт повод вернуться, но не наказывает за паузу

### 14.5 Release hardening

- [ ] Подготовить monitoring / alerts / support runbooks
- [ ] Подготовить leaderboard / reward recompute tools
- [ ] Подготовить backup / restore / migration dry-runs
- [ ] Подготовить staged rollout cohorts
- [ ] Провести soft-launch review и cut all non-essential risk

### 14.6 Exit gate for Phase 4

- [ ] Onboarding и return UX понятны без ручного сопровождения
- [ ] Economy выдерживает поведение реальных игроков
- [ ] Нет major unresolved abuse loops в 1.0 scope
- [ ] Launch content lock date установлена и соблюдается

## 15. Phase 5 — Release 1.0

- **Window:** `H1 2028`
- **Status:** `Planned`
- **Objective:** выпустить цельную PvE-first social build-RPG, где core fantasy уже работает без обещаний “доделаем потом”.
- **Target exit:** `до конца H1 2028`
- **Confidence:** `medium-low`
- **Primary owner:** `Producer / Release + QA / Release`
- **Support owners:** `Gameplay / Platform`, `Game Design`, `Balance`, `Content / UX`
- **Entry criteria:** Phase 4 gate закрыт и launch scope стабилен
- **Why now:** нужно превратить накопленное evidence в безопасный релиз, а не дотащить ещё wishlist-фичи
- **Primary risks:** content lock срывается, known issues размазывают focus, launch support load оказывается выше готовности команды
- **Go / no-go review date:** `2028-05-15`

### 15.0 Release train checkpoints

- [ ] **T-8 weeks:** content lock для 1.0 committed scope
- [ ] **T-6 weeks:** RC0, полный gate review и cut of non-essential risk
- [ ] **T-4 weeks:** launch candidate, hotfix drill, rollback drill, support rehearsal
- [ ] **T-2 weeks:** final go / go-with-cuts / no-go review
- [ ] **Launch week:** watch dashboards, triage, player comms, exploit response window

### 15.1 1.0 content checklist

- [ ] 4 стартовые школы стабильны и различимы
- [ ] У каждой школы есть сильный early, mid и chase payoff
- [ ] Ранний и средний путь не ощущаются пустыми
- [ ] В релизе есть полноценный PvE набор
  - [ ] tutorial zone
  - [ ] 4–5 core regions
  - [ ] elite encounters
  - [ ] bosses
  - [ ] school trials
  - [ ] expedition / dungeon v1
  - [ ] tower / gauntlet v1
- [ ] В релизе есть build / progression набор
  - [ ] loadout breadth
  - [ ] targeted chase
  - [ ] codex
  - [ ] mastery tracks v1
- [ ] В релизе есть social / optional PvP набор
  - [ ] circles v1
  - [ ] mentorship v1
  - [ ] optional async duels v1
- [ ] В релизе есть ethical live-ops foundation
  - [ ] chronicle template
  - [ ] archive / recap / catch-up

### 15.2 Launch readiness

- [ ] Полный release gate review пройден
- [ ] Баланс-пасс по школам и экономике завершён
- [ ] Docs и release notes обновлены
- [ ] Known issues triaged и не содержат launch blockers
- [ ] Hotfix и rollback drill проведён
- [ ] Support / moderation / exploit escalation path готов

### 15.3 Launch success signals

- [ ] Игроки обсуждают школы и сборки, а не только баги и награды
- [ ] Возвращающиеся игроки понимают, зачем заходить снова
- [ ] Ни одна школа не монополизирует core PvE
- [ ] Опциональный PvP не доминирует над PvE progression

### 15.4 Exit gate for Phase 5

- [ ] Go / no-go решение принято осознанно, а не по усталости команды
- [ ] 1.0 shipped

## 16. Phase 6 — Post-launch Year 1

- **Window:** `H2 2028–H1 2029`
- **Status:** `Planned`
- **Objective:** углублять mastery, контент и social systems без потери ясности, честности и поддерживаемости.
- **Confidence:** `medium`

### 16.0 Year 1 quarterly themes

- [ ] **Q3 2028:** stabilization, balance, QoL, return UX hardening
- [ ] **Q4 2028:** first expansion chronicle, content band widening, circles v2 prototypes
- [ ] **Q1 2029:** follow-up по doctrine / limited synergy / PvP experiments
- [ ] **Q2 2029:** year-one retrospective и strategy reset для Year 2+

### 16.1 Content expansion

- [ ] Провести greenlight review для школы Некромантии
- [ ] Провести greenlight review для школы Иллюзий
- [ ] Добавить новые enemy factions и encounter twists
- [ ] Добавить legendary boss remixes
- [ ] Добавить новые school-focused quests / chronicles

### 16.2 Systems expansion

- [ ] Ввести school doctrines v2, если стартовые школы стабильны
- [ ] Ввести limited cross-school synergies, если readability выдержана
- [ ] Улучшить loadout management и compare tools
- [ ] Улучшить codex / archive / build sharing

### 16.3 Social and PvP follow-up

- [ ] Ввести circles v2 projects
- [ ] Протестировать school cups
- [ ] Протестировать draft / limited duel format
- [ ] Рассмотреть team async skirmish только после PvP integrity review

### 16.4 Live-ops and ethics follow-up

- [ ] Делать quarterly balance reviews
- [ ] Делать quarterly retention ethics review
- [ ] Делать catch-up review для вернувшихся игроков
- [ ] Повторять хроники и не строить контент на страхе пропуска

## 17. Phase 7 — Year 2+ direction

- **Window:** `H2 2029+`
- **Status:** `Planned`
- **Objective:** расширять мир и long-tail value только после доказанной устойчивости ядра, экономики и live-ops.

### 17.1 Strategic bets to revisit

- [ ] world-state metagame
- [ ] global school research / great circles
- [ ] legacy boss ecosystem
- [ ] curated player-authored challenges
- [ ] advanced prestige systems без power coercion

### 17.2 Systems that require explicit re-approval

- [ ] deeper PvP formats beyond async duels
- [ ] any trade / gifting / player market system
- [ ] large-scale territory / faction warfare
- [ ] any high-complexity shared-world economy

## 18. Explicitly cut or parked until proven safe

Эти темы **не входят** в активный delivery order, пока ядро не доказано:

- `Cut for 1.0:` real-time PvP
- `Cut for 1.0:` player market / trading economy
- `Cut for 1.0:` guild wars / territory control
- `Cut for 1.0:` attendance-based guild power
- `Cut for 1.0:` heavy crafting simulator
- `Parked:` housing / base building
- `Parked:` fully freeform multi-school combinatorics
- `Parked:` multiple active school buttons as default combat standard

## 19. Planning assumptions

- Даты приблизительные и могут сдвигаться на одно planning window
- Скоуп режется **до** Beta, а не во время launch panic
- Ethical guardrails важнее краткосрочного роста retention
- PvP и social systems не получают права ломать core PvE roadmap
- Любая новая высокая сложность должна доказать player value, clarity, fairness, shippability и maintainability

### 19.1 Known unknowns

- реальная скорость производства контента по школам, encounter'ам и боссам;
- объём реального UX-долга после Vertical Slice playtests;
- сложность миграций при расширении progression/save-state;
- стоимость поддержки circles / optional PvP / live-ops на реальных игроках;
- достаточность telemetry и dashboards для честных product решений.

### 19.2 Roadmap invalidation triggers

Если случается одно из нижеуказанных событий, roadmap пересматривается, а не защищается из упрямства:

- игроки после Vertical Slice всё ещё не могут объяснить разницу школ;
- `RewardLedger` / save contracts требуют крупного перепроектирования после Phase 1;
- content throughput не позволяет собрать committed alpha/beta scope в нужное окно;
- circles или optional PvP создают высокий abuse/support cost;
- onboarding clarity не достигает acceptable уровня после двух последовательных review циклов.

## 20. Change log

Формат записи:

- `дата — что изменили — почему`

Записи:

- **2026-04-17:** PLAN.md переписан в формат подробного execution roadmap с фазами, чекбоксами, датами, release gates и ethical guardrails.
- **2026-04-17:** добавлен production control layer: current quarter, 30/60/90 days, dependency map, cut rules, execution checkpoints, review rhythm.
- **2026-04-17:** зафиксированы versioned `LoadoutSnapshot`, `RewardIntent` и `RewardLedger`; battle reward finalize-path переведён на canonical exact-once reward claim через ledger.
- **2026-04-18:** battle persistence получил `actionRevision` compare-and-swap guard; добавлены duplication matrix, retry rules и Prisma-backed concurrency tests для critical battle/rune flows.
- **2026-04-18:** battle persistence получил versioned `BattleSnapshot` и checked-in compatibility fixtures; legacy raw battle columns оставлены как fallback до отдельного migration window.
- **2026-04-18:** извлечён canonical `SchoolDefinition`; school identity теперь валидируется как контентный контракт и больше не живёт отдельной картой вне content seed.
- **2026-04-18:** переписан school-first onboarding framing; welcome / tutorial / rune onboarding теперь связывают базовую атаку, первую руну, школу рун и следующий шаг без внутреннего жаргона.
- **2026-04-18:** battle result screens получили единый format `Следующая цель`; победа и поражение теперь заканчиваются мотивирующим next-goal block без guilt/FOMO тона.
- **2026-04-18:** existing-player re-entry получил return recap v1 на `start`, `пропустить обучение` и `в приключения`; recap опирается на текущий `PlayerState` и избегает guilt/FOMO copy.
- **2026-04-18:** подготовлен telemetry plan v1 для onboarding clarity, school readability, loadout engagement, economy health и exploit signals через существующий `GameLog` rail.
- **2026-04-18:** подготовлен content pipeline plan v1 с validator tiers и school package template для schools / enemies / encounters / quests / season chronicle configs.
- **2026-04-18:** введён RNG authority v1 для craft / reroll / victory rune drop через `GameRandom` и зафиксированы правила canonical random outcome.
- **2026-04-18:** введён command intent replay policy v1 для keyboard rune mutations; duplicate same-intent craft / reroll / destroy теперь возвращают canonical stored result.
- **2026-04-18:** добавлен release-gate checklist v1 для alt-account abuse, circle/social-lite collusion и optional async PvP abuse без расширения scope до guild wars, trading или real-time PvP.
- **2026-04-18:** profile stat allocation и reset переведены на command intent dedupe для keyboard payloads; stale/retry profile и rune mutation replies теперь стараются вернуть игрока в актуальный контекст вместо выброса в меню.
- **2026-04-18:** rune equip / unequip переведены на command intent dedupe для keyboard payloads; старые кнопки экипировки больше не должны тихо применять loadout к уже изменившемуся выбору руны.
- **2026-04-18:** legacy text `создать` / `сломать` / `~stat` получили server-owned message intent ids; duplicate text replay теперь должен возвращать canonical rune mutation result вместо повторного spend/refund.
- **2026-04-18:** tutorial guardrail tightened: non-`ACTIVE` players больше не должны возвращаться в intro flow через `локация`, а stale intro location state теперь трактуется как обычный adventure path для encounter и rune-scaling, а не как повторное обучение.
- **2026-04-18:** legacy text `+стат` и `сброс` получили server-owned message intent ids; duplicate text replay теперь должен возвращать canonical profile state вместо повторного spend/reset поверх новой сборки.
- **2026-04-18:** legacy text `надеть` и `снять` получили server-owned message intent ids; duplicate text replay теперь должен возвращать canonical rune loadout result вместо повторного применения той же команды.
- **2026-04-18:** `в приключения` теперь считается явным выходом из активного обучения; stale intro location больше не должен возвращать игрока к CTA `⚔️ Учебный бой` после добровольного выхода в adventure flow.
- **2026-04-18:** `локация` / `обучение` больше не должны выдёргивать игрока из активного боя в tutorial screen; при активном бою команда теперь безопасно возвращает текущий battle context вместо ложного экрана обучения.
- **2026-04-18:** `пропустить обучение`, `в приключения` и alias `в мир` переведены на command intent replay rail; duplicate tutorial-navigation commands теперь возвращают canonical exploration state, восстанавливают актуальный tutorial/adventure контекст при stale/pending ветках и не применяются поверх активного боя.
- **2026-04-18:** keyboard battle inputs `атака` / `защита` / `рунное действие` переведены на command intent replay rail; duplicate same-intent turn input теперь должен возвращать canonical battle result вместо повторного разрешения хода.
- **2026-04-18:** legacy text battle inputs `атака` / `защита` / `навыки` / `спелл` переведены на command intent replay rail; duplicate same-message turn input теперь должен возвращать canonical battle result вместо повторного разрешения хода.
- **2026-04-18:** duplicate first-start race на `начать` теперь должен сводиться к одному canonical игроку; проигравшая ветка creation race возвращает существующего мастера без технической ошибки и без второго `player_registered` log.
- **2026-04-18:** `исследовать` и battle-result CTA переведены на command intent replay rail; duplicate same-intent encounter entry теперь возвращает canonical battle, а stuck enemy-turn recovery больше не должен оставлять игрока в подвешенном активном бою.
- **2026-04-18:** `локация` / `обучение` переведены на command intent replay rail; duplicate tutorial-entry input теперь возвращает canonical tutorial state только пока exploration state не успел устареть и больше не маскирует активный бой или более свежий adventure context.
- **2026-04-19:** `__confirm_delete_player__` переведён на exact-once replay rail через account-scoped `DeletePlayerReceipt`; duplicate same-intent confirm теперь возвращает canonical delete success и не должен падать в `player_not_found` после уже успешного удаления.
- **2026-04-19:** legacy text rune navigation (`+руна`, `-руна`, `руны >`, `руны <`, `руна слот 1..4` и alias) переведена на server-owned message intent ids; duplicate same-message navigation теперь должна возвращать canonical rune hub, а stale rune-hub buttons по-прежнему обязаны восстанавливать актуальный экран вместо silent retargeting.
- **2026-04-19:** собран `docs/reviews/phase-1-exit-gate.md`; первый Vertical Slice намеренно зафиксирован как один polished PvE-first early-to-mid journey с Пламенем и Твердью, а social/PvP и risky breadth вынесены из near-term committed scope.
- **2026-04-19:** утверждён `docs/product/1-0-release-charter.md`; 1.0 promise, explicit out-of-scope, ethical retention charter и governance baseline теперь вынесены в отдельный source-of-truth, а не размазаны только по roadmap-частям `PLAN.md`.
- **2026-04-19:** progression rework v1 сдвигает рост от level-up stat allocation к school mastery: новые уровни больше не должны начислять новые stat points, а победы с экипированной школой теперь накапливают mastery и открывают первый non-flat боевой payoff.
- **2026-04-19:** новые игроки теперь стартуют без новых stat points; старая profile-ветка распределения статов остаётся только как compatibility layer для существующих аккаунтов и больше не считается частью normal onboarding path.
- **2026-04-19:** legacy stat allocation полностью удалена из проекта: убраны `+стат` / `сброс`, persistence contract `PlayerStatAllocation`, profile-copy и runtime-зависимости derive/adaptive difficulty от старой stat-point модели.
- **2026-04-19:** собран `docs/reviews/starter-synergy-v1.md`; same-school starter synergy v1 зафиксирована для Пламени и Тверди как читаемая `setup -> payoff` пара без новых кнопок и без proc-web хаоса.
- **2026-04-19:** собран `docs/reviews/rune-hub-ux-v1.md`; rune hub v1 теперь держит быстрый выбор 5 рун на странице, явное состояние `выбрана / надета`, single-slot loadout сейчас и deferred extra slots только после отдельного progression/contract review.
- **2026-04-19:** support-slot v1 включён как первый реальный loadout breadth payoff: mastery milestone открывает 2-й слот, но только `основа` даёт боевую кнопку, а `поддержка` пока добавляет половину статов без второй активки и без proc-web хаоса.
- **2026-04-19:** backlog дополнен двумя post-Vertical-Slice направлениями: prototype второго rune slot unlock через progression/mastery branches и prototype exploration events beyond combat с `следом решений в исследовании` без преждевременного обещания глобальной шкалы добра/зла.
