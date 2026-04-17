# PLAN — Runemasters Return Roadmap

## 1. Назначение

Этот файл — рабочий roadmap проекта.

- `PLAN.md` = куда идём и в каком порядке;
- `CHANGELOG.md` = что уже доставлено;
- `ARCHITECTURE.md` = архитектурные границы и инварианты;
- `RELEASE_CHECKLIST.md` = как выпускаем изменения.

## 2. Product direction

### Основная коррекция курса

Runemasters Return **не копирует Skyrim/Oblivion**. Мы берём только высокоуровневое вдохновение от RPG-фантазии школ, билдов и постепенного раскрытия силы.

Наша собственная формула:

- **базовая атака** всегда остаётся доступной и полезной;
- **рунические школы** — главный слой билд-идентичности;
- **архетипы** — боевые роли внутри школ, а не замена школам;
- **редкость** определяет, сколько школьных техник руна может нести, а не только размер цифр;
- **синергии** добавляются позже как награда за сборку, а не как стартовая перегрузка системы.

### School vs archetype

- **Школа** = fantasy namespace, drop fantasy, progression line, набор техник и будущих синергий.
- **Архетип** = боевой паттерн внутри школы: давление, стойкость, темп, punish, контроль и т.д.
- **Правило v1:** на старте каждая школа может идти с **одним starter archetype**, чтобы не перегрузить UI и баланс.
- **Правило v2+:** позже одна школа может раскрыться в несколько archetype-вариантов, но только после стабилизации school-first core loop.

Текущая стартовая раскладка v1:

- **Школа Пламени** → архетип **Штурм**
- **Школа Тверди** → архетип **Страж**
- **Школа Бури** → архетип **Налётчик**
- **Школа Прорицания** → архетип **Провидец**

### Product pillars

1. **Basic attack is evergreen**
   - игрок никогда не остаётся без понятного действия;
   - атака — baseline, а не “кнопка для тех, кому не повезло с билдом”.

2. **Rune schools define identity**
   - школа отвечает за fantasy и долгую build-ось;
   - архетип отвечает за то, как именно эта школа играет в бою;
   - игрок должен помнить не просто “у меня редкая руна”, а “я играю через школу Х и архетип Y”.

3. **Rarity expands loadout breadth**
   - редкость в первую очередь открывает больше carried skills / слотов / вариантов сборки;
   - raw stat growth остаётся вторичным слоем.

4. **Synergies are earned depth**
   - сначала школа должна работать сама по себе;
   - потом — простые same-school synergy;
   - только затем — сложные межшкольные связки.

## 3. Текущий срез продукта

### Что уже доставлено

- tutorial-first старт и keyboard-first VK flow;
- adaptive difficulty без ручного выбора уровня угрозы;
- idempotency-защита боевых и рунных мутаций;
- paged rune hub вместо листания по одной руне;
- compact event-first battle presentation;
- первый playable rune combat slice: активные рунные действия, cooldown/mana state и боевой action resolver;
- post-tutorial objective layer;
- базовый tactics layer: `атака`, `защита`, `рунное действие`, enemy intent, telegraphed threat patterns;
- release rails: `check`, `content:validate`, `release:preflight`, smoke tests, CI.

### Текущий вердикт

`iterate`

### Почему ещё не релиз

- школы рун пока ощущаются как прототипы, а не как полноценные билд-направления;
- редкость всё ещё слишком близка к stat-growth, а не к loadout-growth;
- синергии почти не раскрыты;
- игроку пока не хватает сильного school-driven return motivation;
- контент школ и ранняя discoverability пока слишком узкие для устойчивого retention.

## 4. Правила roadmap

### Статусы

- `done` — уже доставлено;
- `now` — активная очередь, делаем следующим;
- `next` — готово к старту после блока `now`;
- `later` — ценно, но ещё не планируем в ближайший цикл;
- `parked` — сознательно отложено.

### Приоритеты

- `P0` — без этого нельзя прийти к сильному core loop;
- `P1` — усиливает удержание после закрытия P0;
- `P2` — расширяет игру после стабилизации основы.

### Definition of done для каждой инициативы

- доменная логика лежит в `domain`, а не расползается по VK transport;
- есть automated tests на critical happy/failure path;
- нет регрессии по duplicate rewards, inventory underflow и stale state;
- player-facing поведение зафиксировано в `README.md` / `CHANGELOG.md` / `PLAN.md`;
- `npm run check` и `npm run release:preflight` проходят.

### Term rules

- player-facing primary layer: **базовая атака**, **школы рун**, **рунные техники / рунные навыки**, **редкость расширяет loadout**;
- secondary/system layer: **архетип** = боевой стиль внутри школы;
- не использовать в документации формулировки вида:
  - “Skyrim clone”;
  - “Oblivion clone”;
  - “руны заменяют базовый бой”;
  - “редкость = просто больше цифр”.

## 5. Active roadmap

### 5.1 DONE

#### [done][P0] Milestone A — Combat foundation and baseline clarity

**Цель:** построить надёжный, детерминированный и читаемый baseline бой.

##### A1 — Battle state contract

- [x] battle snapshot устойчив к recovery и finalize;
- [x] новые действия не ломают active battle idempotency;
- [x] есть тесты на action resolution, save/recovery и invalid action paths.

##### A2 — First playable rune payoff

- [x] игрок получает первую meaningful rune payoff уже в первом игровом цикле;
- [x] кнопка preview ушла, рунное действие реально влияет на бой;
- [x] tutorial reward loop доводит до первой активной руны.

##### A3 — Baseline tactics

- [x] `защита` как universal utility;
- [x] первый telegraphed threat (`Тяжёлый удар`);
- [x] второй telegraphed threat (`guard-break`), чтобы защита не была единственным правильным ответом;
- [x] battle UI показывает доступные действия и намерение врага.

### 5.2 NOW

#### [now][P0] Milestone B — сделать школы рун главным слоем билдов

**Почему это важно**

Базовый бой уже достаточно понятен. Следующий настоящий продуктовый рывок — не ещё одна универсальная кнопка, а перевод глубины в **школы рун**.

##### B1 — Rune school contract

- **Player impact:** у игрока появляется ясная build-идентичность.
- **Scope:**
  - закрепить модель `school -> rune -> skills -> battle choices`;
  - decouple школу, archetype, ability и rarity в roadmap и будущих контрактах;
  - закрепить правило: школа = fantasy axis, archetype = combat-role axis.
- **Out of scope:** свободная multi-school сборка и сложный synergy engine.
- **Acceptance:**
  - [ ] в документации и будущем implementation plan школа = основная identity axis;
  - [ ] архетип формализован как подслой школы, а не как конкурирующая сущность;
  - [ ] basic attack формально остаётся evergreen baseline;
  - [ ] rarity описывается как loadout growth, а не как stat inflation.

##### B2 — First stable school roster

**Current progress:**

- [x] player-facing слой больше показывает `школу`, а не `архетип`;
- [x] Пламя, Твердь и Прорицание получили battle-visible identity уже в текущем loop;
- [x] Твердь доведена до первого полного school package: passive lane + active lane;
- [ ] довести стартовый roster до полного school-v1 без “пустых” ощущений;

- **Player impact:** игрок начинает чувствовать разницу между стилями боя.
- **Scope:**
  - довести до полноценного v1 минимум 3–4 стартовых школы;
  - текущие starter schools (`Пламя`, `Твердь`, `Буря`, `Прорицание`) доводятся до чистой school/archetype модели;
  - у каждой стартовой школы: 1 понятная роль, 1 читаемый active lane, 1 реальный passive lane.
- **Out of scope:** сразу 8–10 школ.
- **Acceptance:**
  - [ ] каждая стартовая школа меняет решения в бою, а не только цифры;
  - [ ] passive-only школы больше не выглядят “недоделанными”; 
  - [ ] игрок может различить школы без чтения длинной справки.

##### B3 — School expansion queue

- **Player impact:** появляется ожидание будущих билдов и фантазий.
- **Scope:**
  - подготовить expansion queue школ после стабилизации v1;
  - кандидаты следующей волны: **Некромантия**, **Иллюзии**, затем другие школы по результатам playtest;
  - каждая новая школа должна иметь не только fantasy, но и боевую роль.
- **Out of scope:** немедленная реализация всех школ.
- **Acceptance:**
  - [ ] у roadmap есть явная очередь школ после v1;
  - [ ] necromancy / illusion внесены как planned schools, а не “когда-нибудь”; 
  - [ ] новая школа без роли не допускается в delivery queue.

##### B4 — School-first onboarding and UX

- **Player impact:** игрок понимает, что базовая атака — основа, а школа — его стиль.
- **Scope:**
  - переписать framing вокруг школ, а не вокруг “ещё одной рунной кнопки”;
  - объяснять редкость через carried skills / loadout breadth;
  - добавить сравнение школ и near-term promise на ранних экранах.
- **Out of scope:** encyclopedia-style codex.
- **Acceptance:**
  - [ ] onboarding объясняет: attack baseline -> school identity -> rarity expands school kit;
  - [ ] player-facing copy не использует `archetype`;
  - [ ] battle/rune UI обещает стиль, а не только resource state.

#### Exit criteria для Milestone B

- [ ] у игрока есть минимум 3 действительно разные school fantasies;
- [ ] базовая атака остаётся полезной на всех ранних стадиях;
- [ ] школы читаются как главный build layer;
- [ ] ранний player journey создаёт “я хочу попробовать другую школу”.

### 5.3 NEXT

#### [next][P0] Milestone C — rarity-based loadout growth

**Почему это важно**

Школы без хорошей модели редкости быстро превращаются в гонку статов. Редкость должна расширять school kit, а не ломать баланс голыми числами.

##### C1 — Rarity profile model

- **Player impact:** rarer rune feels broader, not just bigger.
- **Scope:**
  - закрепить правила: сколько active/passive capacity даёт каждая редкость;
  - ограничить raw stat contribution рун как вторичный слой;
  - исключить ситуацию “лучшая редкость всегда сильнее любой школы”.
- **Suggested ladder:**
  - обычная — school tag + 1 простой эффект;
  - необычная — 1 активный или 1 пассивный school effect;
  - редкая — 1 active + 1 passive;
  - эпическая — второй passive / modifier quality step;
  - легендарная+ — keystone/synergy capacity, а не новый multiplicative damage layer.

##### C2 — Pre-battle loadout growth

- **Player impact:** игрок собирает loadout до боя, а не спамит всё сразу в бою.
- **Scope:**
  - rarity unlocks selectable school package;
  - ранняя версия остаётся с одним `RUNE_SKILL` button в бою;
  - complexity растёт через pre-battle choice, а не через 5 кнопок сразу.
- **Out of scope:** multiple in-battle rune buttons, mid-battle swapping.

##### C3 — Targeted drops and chaseability

- **Player impact:** игрок охотится за школой, а не только молится RNG.
- **Scope:**
  - разные источники/биомы/цели начинают тяготеть к школам;
  - у игрока есть способ преследовать нужный school fantasy;
  - rarity chase не превращается в pure casino.
- **Out of scope:** большой crafting simulator.

#### Exit criteria для Milestone C

- [ ] редкость объясняется как loadout expansion, а не как простая инфляция чисел;
- [ ] higher rarity не убивает relevance базовой атаки и низкой редкости;
- [ ] игрок может chase'ить школу целенаправленно;
- [ ] loadout legality и backward compatibility покрыты тестами.

### 5.4 NEXT

#### [next][P1] Milestone D — first synergies and return motivation

**Почему это важно**

Без синергий и near-term goals система школ останется красивой, но быстро выгорит. Нужна минимальная причина возвращаться ради сборки.

##### D1 — Same-school starter synergies

- **Player impact:** появляется первый “build clicked” moment.
- **Scope:**
  - сначала только простые deterministic same-school связки;
  - synergy = setup -> payoff, без proc-web хаоса;
  - cross-school synergies позже.

##### D2 — Short-term build goals

- **Player impact:** игрок уходит из сессии с ясным school-driven next goal.
- **Scope:**
  - 2–3 коротких цели на 1–2 сессии;
  - прогресс к следующей школьной технике / rarity breakpoint / synergy unlock;
  - явные next-step prompts.

##### D3 — Economy around builds

- **Player impact:** ресурсы начинают работать на buildcraft, а не только на reroll spam.
- **Scope:**
  - school-targeted sinks;
  - anti-inflation rails;
  - отсутствие salvage-positive loops.

#### Exit criteria для Milestone D

- [ ] игрок видит первый реальный synergy payoff;
- [ ] у каждой сессии есть school-driven next target;
- [ ] economy не позволяет brute-force ломать progression;
- [ ] low-rarity runes не обесцениваются слишком рано.

### 5.5 LATER

#### [later][P1] Milestone E — controlled depth and expansion schools

- новые школы второй волны: **Некромантия**, **Иллюзии**, затем другие;
- больше enemy patterns как поддержка school play, а не как замена school depth;
- keystone passives и limited cross-school synergies;
- school-driven progression map и stronger long-session retention.

### 5.6 PARKED

#### [parked][P2] Milestone F — scale-out after the core is proven

Сюда не заходим, пока школы, редкость и базовая loop не станут реально удерживающими.

- freeform cross-school combo engine;
- несколько активных кнопок школы одновременно как основной стандарт;
- mid-battle respec/loadout swap;
- большой school roster с первого дня;
- PvP;
- масштабный crafting/metagame до стабилизации core loop.

## 6. Milestone view

### Milestone A — Combat foundation and baseline clarity

- battle snapshot / resolver / recovery / idempotency;
- first active rune payoff;
- baseline tactics and enemy intent.

**Ship gate:** игрок понимает бой и чувствует первый рунный payoff.

### Milestone B — Rune schools as the main build layer

- school contract;
- стартовый roster;
- expansion queue;
- school-first onboarding.

**Ship gate:** игрок выбирает не просто руну, а школу.

### Milestone C — Rarity-based loadout growth

- rarity profiles;
- pre-battle loadout breadth;
- targeted chase.

**Ship gate:** редкость ощущается как “моя школа раскрывается шире”, а не как “мне просто повезло на цифры”.

### Milestone D — First synergies and return motivation

- same-school starter synergies;
- short-term goals;
- build economy.

**Ship gate:** игрок уходит из сессии с ясным “что я дособеру дальше”.

### Milestone E — Controlled depth

- новые школы второй волны;
- keystones и limited cross-school synergies;
- deeper encounter variety.

**Ship gate:** игра уже не просто про первую руну, а про разные school fantasies и их chaseability.

## 7. Release gates для roadmap-инициатив

### Обязательные automated checks

- `npm run check`
- `npm run release:preflight`
- unit tests на доменную механику
- smoke tests на ключевой player journey

### Обязательные manual smoke paths

- регистрация -> tutorial fight -> первая school rune;
- rune hub: page navigation -> slot selection -> equip -> craft -> reroll -> destroy;
- active battle recovery после re-entry;
- victory/defeat flows без duplicate rewards;
- first-loss и first-return UX;
- school-driven payoff: игрок понимает, чем одна школа отличается от другой;
- rarity-driven payoff: игрок понимает, что редкость расширила loadout, а не просто дала +цифры.

### Обязательные docs updates

- `README.md` — если меняется player-facing flow;
- `CHANGELOG.md` — для shipped изменений;
- `ARCHITECTURE.md` — если меняется контракт battle/rune/loadout state;
- `RELEASE_CHECKLIST.md` — если меняется ship procedure или smoke path.

## 8. Метрики готовности

### Продуктовые

- базовая атака остаётся релевантной;
- минимум 3 школы ощущаются как разные стили;
- игрок получает first-session school payoff;
- редкость меняет breadth сборки, а не только числа;
- есть ясный near-term build goal на следующую сессию.

### Технические

- battle state детерминированно тестируется и восстанавливается;
- нет duplicate reward regressions и inventory underflow regressions;
- transport остаётся тонким;
- контент и баланс валидируются до релиза;
- новые school/rarity/loadout контракты не ломают legacy hydration.

## 9. Appendix — shipped foundations

- модульная архитектура `domain / application / infrastructure / transport`;
- единый каталог команд и keyboard-first transport;
- recovery зависших боёв и Prisma idempotency rails;
- commit-based versioning, CI и release preflight;
- paged rune hub и compact battle UI;
- baseline tactics layer с enemy intent;
- early-game smoothing и rarity caps для natural rune drops.

## 10. Правило обновления

Этот файл обновляется при каждом крупном изменении:

- продуктового приоритета;
- структуры roadmap;
- архитектурной границы, которая влияет на delivery order;
- определения школ, редкости или loadout growth;
- release gate или definition of done.
