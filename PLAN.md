# PLAN — Runemasters Return Roadmap

## 1. Назначение

Этот файл — рабочий roadmap проекта.

- `PLAN.md` = куда идём и в каком порядке;
- `CHANGELOG.md` = что уже доставлено;
- `ARCHITECTURE.md` = архитектурные границы и инварианты;
- `RELEASE_CHECKLIST.md` = как выпускаем изменения.

## 2. Текущий срез продукта

### Что уже доставлено

- tutorial-first старт и keyboard-first VK flow;
- adaptive difficulty без ручного выбора уровня угрозы;
- idempotency-защита боевых и рунных мутаций;
- paged rune hub вместо листания по одной руне;
- compact event-first battle presentation;
- первый playable rune combat slice: активные рунные действия, cooldown/mana state и боевой action resolver;
- tutorial reward loop с гарантированной первой активной руной и post-tutorial objective layer;
- первый tactics layer: универсальная защита, телеграф тяжёлого удара врага и более явный action block в бою;
- release rails: `check`, `content:validate`, `release:preflight`, smoke tests, CI.

### Текущий вердикт

`iterate`

### Почему ещё не релиз

- в бою уже есть базовая развилка `атака / защита / рунное действие`, но enemy pattern set пока ещё слишком узкий;
- rune fantasy уже работает в core loop, но depth и counterplay пока слишком тонкие;
- mid-session и next-session мотивация пока слабые;
- контента и battle variety пока мало для устойчивого retention.

## 3. Правила roadmap

### Статусы

- `done` — уже доставлено;
- `now` — активная очередь, делаем следующим;
- `next` — готово к старту после блока `now`;
- `later` — ценно, но ещё не планируем в ближайший цикл;
- `parked` — сознательно отложено.

### Приоритеты

- `P0` — без этого нельзя прийти к сильному core loop;
- `P1` — усиливает удержание и глубину после закрытия P0;
- `P2` — расширяет игру после стабилизации основы.

### Definition of done для каждой инициативы

- доменная логика лежит в `domain`, а не расползается по VK transport;
- есть automated tests на критичные happy path и failure path;
- нет регрессии по duplicate rewards, inventory underflow и stale state;
- player-facing поведение зафиксировано в `README.md` / `CHANGELOG.md` / `PLAN.md`;
- `npm run check` и `npm run release:preflight` проходят.

## 4. Active roadmap

### 4.1 DONE

#### [done][P0] Milestone A — сделать рунную fantasy реальной в бою

**Почему это важно**

Сейчас игрок видит руны, архетипы и способности, но в реальном бою почти не принимает решений. Это главный product blocker.

##### Initiative A1 — новый боевой state contract

- **Player impact:** открывает реальные боевые действия кроме базовой атаки.
- **Scope:**
  - расширить `BattleView` под action/effect/cooldown/status state;
  - ввести единый battle action resolver;
  - подготовить persistence/recovery для нового боевого состояния;
  - начать вытаскивать RNG из `Math.random()` в контролируемые seams.
- **Out of scope:** PvP, глубокий combo engine, десятки статусов.
- **Dependencies:** нет.
- **Acceptance:**
  - [x] battle snapshot устойчив к recovery и finalize;
  - [x] новые действия не ломают active battle idempotency;
  - [x] есть тесты на action resolution, save/recovery и invalid action paths.

##### Initiative A2 — первый playable rune combat slice

- **Player impact:** игрок реально чувствует, что руна меняет бой.
- **Scope:**
  - 2–3 исполняемых рунных действия для стартовых архетипов;
  - tutorial beat: `получил руну -> экипировал -> использовал в бою`;
  - battle UI показывает доступность, стоимость и результат действия.
- **Out of scope:** полноценные skill trees, сложные синергии, full archetype roster.
- **Dependencies:** `A1`.
- **Acceptance:**
  - [x] в первом игровом цикле игрок использует хотя бы одно действие руны;
  - [x] кнопка preview больше не обещает несуществующий payoff;
  - [x] rune action читается в логе боя и влияет на исход.

##### Initiative A3 — post-tutorial objective layer

- **Player impact:** после первого tutorial win игрок понимает, что делать дальше и зачем возвращаться.
- **Scope:**
  - mission-like next goals в сообщениях;
  - явный путь: первый реальный бой, первый stat spend, первая экипированная руна, первый repeat win;
  - context-aware CTA на ключевых экранах.
- **Out of scope:** большая квестовая система.
- **Dependencies:** можно делать параллельно с `A2`.
- **Acceptance:**
  - [x] после tutorial игрок получает один ясный следующий goal;
  - [x] первый loss, первый rune drop и первый stat point не оставляют игрока без guidance;
  - [x] help layer не превращается в стену текста.

### 4.2 NOW

#### [now][P0] Milestone B — дать бою вторую глубину, а не вторую кнопку

##### Initiative B1 — enemy patterns и universal combat actions

**Current progress:**

- [x] универсальная `Защита` как базовое боевое действие;
- [x] первый enemy intent: телеграфируемый `Тяжёлый удар`;
- [ ] расширить набор enemy patterns и второй universal action, если он всё ещё нужен после playtest.

- **Player impact:** бой перестаёт быть чистой DPS-гонкой.
- **Scope:**
  - 1–2 универсальных действия кроме атаки;
  - несколько телеграфируемых enemy patterns: shielded, charging, fragile caster, enraged beast;
  - battle copy объясняет, что произошло и почему выбор mattered.
- **Out of scope:** сложный AI, большой zoo статусов.

##### Initiative B2 — stat model и adaptive difficulty retune

- **Player impact:** игрок больше не попадает в trap picks, а recommended threat ближе к реальной сложности.
- **Scope:**
  - переоценить value `intelligence`, `magicDefence`, `dexterity` после появления новых действий;
  - привязать adaptive difficulty к реальной win power, а не к красивым цифрам;
  - убрать явные dominant builds ранней игры.
- **Out of scope:** финальный эндгейм-баланс.

##### Initiative B3 — battle QA hardening

- **Player impact:** меньше багов в реальных multi-turn боях.
- **Scope:**
  - duplicate-submit, stale keyboard, re-entry, enemy-first, invalid action tests;
  - deterministic combat tests и manual smoke paths для новых боевых правил.
- **Out of scope:** broad automation platform beyond current test stack.

#### Exit criteria для Milestone B

- [ ] в обычном бою есть хотя бы 2–3 осмысленных решения;
- [ ] нет явного one-build meta в стартовом сегменте;
- [ ] recommended threat не врёт игроку;
- [ ] расширенный battle flow покрыт unit + smoke tests.

### 4.3 NEXT

#### [next][P1] Milestone C — progression, economy, return motivation

##### Initiative C1 — short-term progression ladder

- **Player impact:** появляется reason to return tomorrow, а не только “ещё один бой”.
- **Scope:**
  - 2–3 коротких goals на несколько боёв;
  - заметный next unlock в горизонте 1–2 сессий;
  - build identity growth поверх выбранной руны/стиля боя.

##### Initiative C2 — economy sinks и reward loop

- **Player impact:** ресурсы становятся meaningful, а крафт/реролл не сводятся к одной кнопке без выбора.
- **Scope:**
  - gold/material sinks;
  - повторяемые и aspirational sinks для shard economy;
  - anti-inflation rails и reward banding по уровням/биомам.

##### Initiative C3 — content-to-transport separation

- **Player impact:** косвенный, но критичный для скорости поставки контента без случайных VK regression.
- **Scope:**
  - отделить контентные таблицы от transport-описаний;
  - подготовить DTO/application contracts там, где VK handler начинает разрастаться;
  - не допустить, чтобы новые руны/мобы требовали точечных правок в transport.

#### Exit criteria для Milestone C

- [ ] у каждой главной валюты есть repeatable sink и aspirational sink;
- [ ] игрок уходит из сессии с понятным near-term goal;
- [ ] новые контентные сущности добавляются без касания VK handler логики;
- [ ] balance и content validation ловят сломанные tuning changes до релиза.

### 4.4 PARKED

#### [parked][P2] Milestone D — breadth before launch scale-out

Сюда не заходим, пока core loop не станет по-настоящему удерживающим.

- предметы как отдельный build layer;
- полноценный crafting layer;
- квесты и сезонные ивенты;
- PvP;
- большой metagame поверх коллекции рун;
- multi-channel transport scaling beyond VK.

## 5. Milestone view

### Milestone A — Rune combat foundation

- A1. Новый боевой state contract
- A2. Первый playable rune combat slice
- A3. Post-tutorial objective layer

**Ship gate:** к концу milestone игрок должен не просто получить руну, а прожать её в бою и захотеть повторить этот опыт.

### Milestone B — Combat depth and fairness

- B1. Enemy patterns и новые действия
- B2. Retune статов и adaptive difficulty
- B3. QA hardening

**Ship gate:** бой должен быть интересен ко второй сессии, а не только понятен в первой.

### Milestone C — Retention and progression

- C1. Short-term progression ladder
- C2. Economy sinks и reward loop
- C3. Content/transport separation

**Ship gate:** игрок должен завершать сессию с ясным “зачем вернуться”.

### Milestone D — Release candidate

В релизную прямую выходим только после A+B+C.

**Release blockers before public launch:**

- core loop ещё недостаточно глубокий;
- progression cadence ещё не доказан на нескольких сессиях;
- content breadth пока недостаточен для устойчивого repeat play;
- release smoke должен покрывать не только техническую зелень, но и compelling player journey.

## 6. Release gates для roadmap-инициатив

### Обязательные automated checks

- `npm run check`
- `npm run release:preflight`
- unit tests на доменную механику
- smoke tests на ключевой player journey

### Обязательные manual smoke paths

- регистрация -> tutorial fight -> первый real fight;
- rune hub: page navigation -> slot selection -> equip -> craft -> reroll -> destroy;
- active battle recovery после re-entry;
- victory/defeat flows без duplicate rewards;
- first-loss и first-return UX.

### Обязательные docs updates

- `README.md` — если меняется player-facing flow;
- `CHANGELOG.md` — для shipped изменений;
- `ARCHITECTURE.md` — если меняется контракт battle/rune state;
- `RELEASE_CHECKLIST.md` — если меняется ship procedure или smoke path.

## 7. Метрики готовности

### Продуктовые

- бой перестаёт быть `attack-only` по факту, а не только по UI;
- у игрока есть заметимый first-session rune payoff;
- есть понятный near-term goal на следующую сессию;
- разные руны/архетипы ведут к разным решениям, а не только к разным цифрам.

### Технические

- battle state детерминированно тестируется и восстанавливается;
- нет duplicate reward regressions и inventory underflow regressions;
- transport остаётся тонким;
- контент и баланс валидируются до релиза.

## 8. Appendix — shipped foundations

- модульная архитектура `domain / application / infrastructure / transport`;
- единый каталог команд и keyboard-first transport;
- recovery зависших боёв и Prisma idempotency rails;
- commit-based versioning, CI и release preflight;
- paged rune hub и compact battle UI;
- early-game smoothing и rarity caps для natural rune drops.

## 9. Правило обновления

Этот файл обновляется при каждом крупном изменении:

- продуктового приоритета;
- структуры roadmap;
- архитектурной границы, которая влияет на delivery order;
- release gate или definition of done.
