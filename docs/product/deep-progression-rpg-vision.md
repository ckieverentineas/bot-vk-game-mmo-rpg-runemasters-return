# Deep Progression RPG Vision

## Status

- Status: `exploratory vision v1`
- Purpose: зафиксировать long-horizon product direction для более глубокой progression-centric версии Runemasters Return
- Scope class: `not committed 1.0 scope`

## Boundary and usage notes

Этот документ:

- **не меняет** обещание релиза из `docs/product/1-0-release-charter.md`;
- **не является** committed roadmap или production promise;
- служит **vision/reference**, к которому можно возвращаться после доказательства core PvE loop;
- при конфликте уступает приоритет `1.0 charter`, `PLAN.md`, `ARCHITECTURE.md` и текущим platform constraints;
- требует отдельной product, tech, ethical-retention и exploit-review оценки перед переносом любой системы в committed plan.

Особенно важно:

- daily/use-based growth не должны превращаться в attendance treadmill;
- alignment не должен становиться shame-system или moral trap;
- restored cities не должны навязывать civic guilt;
- любой сильный systemic layer должен проходить replay-safety и reward-safety review.

---

## 1. Vision summary

Runemasters Return в long-horizon виде — это **PvE-first social build-RPG** для коротких, но осмысленных сессий, где игрок:

- собирает выраженный **билд** через skill trees, школы и руны;
- растёт не только по level-track, но и через **использование**, mastery и стиль игры;
- принимает **моральные решения** с постоянными последствиями для мира;
- помогает **восстанавливать города** и меняет карту доступных возможностей;
- возвращается в игру ради **новых решений, новых комбинаций и ощутимого world impact**, а не из-за страха пропустить награду.

### Product north star

> Игрок должен ощущать, что он не просто усиливает цифры, а выращивает уникального рунного героя, оставляет след в мире и получает новые meaningful choices на каждом следующем этапе прогрессии.

---

## 2. Pillar map and phasing

| Pillar | Product role | Recommended 1.0 depth | Post-1.0 expansion |
|---|---|---|---|
| Multi-layered progression + branching skill trees | Главный двигатель идентичности и replayability | Full core | Больше школ, глубже capstones, doctrines |
| Rune augmentation + modular equipment | Материальное выражение билда и меты | Full core | Больше rune families и late keystones |
| Dynamic exploration + karma/alignment + consequences | Differentiation и world consequence layer | Vertical slice | Шире faction web и geography gates |
| Restored cities + societal growth | Belonging, persistence, visible world progress | Core-lite / vertical slice | Больше городов и civic specialization |
| Daily engagement + use-based growth | Return rhythm + organic mastery | Full core with hard guardrails | Больше content-routing и mastery bands |

### Key design rule

Для 1.0 не нужно пытаться «полностью реализовать все пять столпов на максимуме». Правильная стратегия:

1. доказать силу билд-прогрессии;
2. привязать её к читаемому rune/loadout loop;
3. добавить ограниченный, но заметный слой world consequence и restored cities;
4. поддержать это ethical return rhythm и use-based mastery.

---

## 3. Pillar 1 — Multi-layered character progression & branching skill trees

## 3.1. Progression philosophy

Прогрессия делится на два слоя:

### A. Structured progression
Даёт:

- unlock'и действий;
- специализацию;
- билд-рамку;
- keystone-переходы;
- долгосрочный план развития.

### B. Organic progression
Даёт:

- рост характеристик через meaningful use;
- личный оттенок внутри похожих билдов;
- ощущение, что стиль игры формирует персонажа, а не только экран прокачки.

## 3.2. Progression currencies

- **Очки Пути (ОП)** — за каждый уровень; обычные узлы;
- **Очки Специализации (ОС)** — раз в 3 уровня; развилки, сильные узлы;
- **Очки Ключа (ОК)** — раз в 10 уровней; keystone-узлы;
- **Очки Рунной Ёмкости (ОРЁ)** — раз в 5 уровней; доступ к новым сокетам или их tier-upgrade;
- **Очки Доктрины (ОД)** — за важные moral/world milestones; alignment-doctrine progression.

## 3.3. Tree families

### 1) Авангард
Темы:

- guard;
- break;
- counterplay;
- frontline control;
- тяжелые окна давления.

### 2) Плетение
Темы:

- attunement;
- spell chaining;
- статусные связки;
- delayed payoff;
- управление откатами/темпом.

### 3) Стычка
Темы:

- мобильность;
- инициатива;
- crit windows;
- chase;
- repositioning.

### 4) Хранитель
Темы:

- барьеры;
- sustain;
- cleanse;
- resist;
- soft-support utility.

### 5) Рунодел
Темы:

- сокеты;
- резонанс;
- rune efficiency;
- гибридизация школ;
- conversion rules.

## 3.4. Tree structure

Каждое дерево использует ring-and-junction layout:

- **Тир 1** — теги, основы, low-risk utility;
- **Тир 2** — role identity;
- **Тир 3** — build-defining synergies;
- **Тир 4** — capstones / keystones.

Игрок может идти вглубь:

- по прямой специализации;
- через lateral junction в соседнее дерево;
- через tag-требования, если уже поддерживает нужную механику.

## 3.5. Archetype examples

| Archetype | Trees | Schools | Gameplay identity |
|---|---|---|---|
| Палач Пепла | Авангард + Плетение | Пламя | Burn pressure, exposure windows, finishers |
| Несокрушимый Ломатель | Авангард + Хранитель | Твердь | Guard, attrition, break and punish |
| Штормовой Дуэлянт | Стычка + Плетение | Буря | Tempo theft, repositioning, burst windows |
| Прорицатель Узоров | Плетение + Хранитель | Прорицание | Prediction, delayed punishment, curse logic |
| Охотник Знаков | Стычка + Прорицание | Буря + Прорицание | Mark, pursuit, pre-read and punish |
| Горнильный Страж | Авангард + Пламя | Твердь + Пламя | Fortified aggression, break into detonation |

## 3.6. Mathematical synergy model

### Core formula

**Эффективность действия = База × Множитель Атрибутов × Множитель Дерева × Множитель Рун × Контекст**

Где:

- **Множитель Атрибутов** — organic stats contribution;
- **Множитель Дерева** — specialization / hybrid synergy;
- **Множитель Рун** — socket logic и resonance;
- **Контекст** — enemy asks, alignment policy, city modifiers, region state.

### Specialization reward

**Бонус специализации = 1 + (0.02 × Очки в основном дереве) + (0.04 × Число capstones)**

Практический кап: ~**+32%**

### Hybrid reward

**Бонус гибрида = 1 + (0.05 × Число комплементарных пар)**

Практический кап: ~**+20%**

### Complementary tag pairs

- Burn + Mark → окно детонации;
- Guard Break + Heavy Hit → эффект раскола;
- Insight + Crit Window → предсказанный удар;
- Barrier + Cleanse → sanctuary trigger;
- Прорицание + Sigil → delayed repeat;
- Mobility + Backline Mark → pursuit chain.

### Balance intention

- specialist builds дают ceiling и consistency;
- hybrid builds дают breadth и encounter-solving power;
- neither should dominate universally.

## 3.7. Basic attack track

Отдельная progression-line для базовой атаки нужна, чтобы сохранить правило **Basic attack is evergreen**.

Три основные ветви:

- **Precision** — mark, crit windows, single-target discipline;
- **Rhythm** — tempo, charge, resource cycling;
- **Breaker** — shield crack, armor disruption, exposure setup.

Итог: даже магический билд не должен играть как «спамлю только рунные кнопки». Basic attack остаётся meaningful setup tool.

## 3.8. Combat attrition boundary

Идея “HP/мана не восстанавливаются полностью после каждого боя” может усилить путешествие, но это отдельная attrition-система, а не маленький balance toggle.

Перед включением нужно доказать:

- у игрока есть понятный и честный способ восстановиться;
- поражение и пауза не превращаются в наказание;
- ранние школы остаются playable без обязательного гринда расходников;
- difficulty tuning учитывает серию боёв, а не только один isolated encounter;
- UI ясно показывает состояние до входа в бой.

До этого безопасная 1.0-позиция: боевой snapshot начинается восстановленным, а долговременная усталость/раны остаются deferred design slice.

Уже допустимый безопасный срез внутри этой границы: мана может медленно восстанавливаться **внутри боя**, когда ход возвращается к игроку. Это поддерживает ритм рунных действий, но не создаёт долговременной усталости, календарных recovery-циклов или скрытого наказания за серию боёв.

---

## 4. Pillar 2 — Rune augmentation & modular equipment

## 4.1. Core role of runes

Руны — это secondary customization layer, который отвечает за то, **как именно** играется билд.

- skill trees определяют framework;
- runes меняют routing, triggers и texture билда;
- equipment задаёт каналы, через которые руны раскрываются.

## 4.2. Rune lattice

Персонаж открывает постоянную **Рунную Решётку**.

### Socket types

1. **Малый сокет** — стат и utility tuning
2. **Основной сокет** — усиление school identity
3. **Паттерн-сокет** — изменение формы применения
4. **Резонансный сокет** — cross-rune synergy
5. **Keystone-сокет** — rule-changing behavior

### Unlock order

- early game — малые и основные;
- midgame — паттерн и резонанс;
- lategame — keystone и high-ceiling conversion.

## 4.3. Modular equipment roles

- **Оружие** — delivery pattern, finisher logic;
- **Броня** — mitigation, guard conversion, sustain hooks;
- **Фокус / реликвия** — attunement, sigils, delayed effects;
- **Аксессуары** — mobility, doctrine expression, utility pivots.

## 4.4. Rune categories

| Rune type | Early role | Mid role | Late role |
|---|---|---|---|
| Стат-руны | Health / attack / defence / dexterity / intelligence | dual-stat tuning | sidegrade efficiency |
| Технико-руны | resource and cooldown shaping | trigger unlocks | alternate rotation logic |
| Конверсионные | damage ↔ barrier / mark / break shifts | cross-school routing | build-defining transforms |
| Доктринальные | alignment-flavored expression | faction / narrative interaction | doctrine paths |
| Keystone-руны | — | rare unlock | mechanic transformation |

## 4.5. Attribute interaction

Примеры scaling logic:

- **Пламя** → Attack + Intelligence;
- **Твердь** → Defence + Attack;
- **Буря** → Dexterity + Intelligence;
- **Прорицание** → Intelligence + Resolve.

Это делает выбор рун meaningful: одна и та же руна в разном stat profile ощущается по-разному.

## 4.6. Socket-driven meta shift

### Early meta

- закрыть слабости;
- усилить fantasy школы;
- добавить понятные sidegrades.

### Mid meta

- открыть триггеры;
- включить resonance logic;
- добавить hybrid routes.

### Late meta

- менять правила ротации;
- переопределять роль basic attack;
- создавать encounter-specific tech paths;
- открывать high-risk / high-ceiling build variants.

## 4.7. Rarity philosophy

- **Common** — усиливает существующий паттерн;
- **Rare** — добавляет conditional synergy;
- **Epic** — открывает новый маршрут;
- **Legendary** — даёт style-changing effect с tradeoff.

Результат: редкость расширяет **breadth**, а не только raw numbers.

---

## 5. Pillar 3 — Dynamic exploration, karma/alignment, consequential narratives

## 5.0. Game Master / adventure director boundary

Game Master слой допустим только как **PvE adventure director**, а не как live-ops pressure system.

Его роль:

- подсвечивать, почему текущий бой или маршрут важен;
- подбирать encounter framing под школу, регион и состояние героя;
- помогать игроку читать тактическое испытание без внешней вики;
- усиливать ощущение, что мир отвечает на стиль игры.

Жёсткие ограничения:

- не использовать limited-time power rewards;
- не давить фразами вида “зайди сегодня или потеряешь”;
- не привязывать силу к streak'ам, календарю или расписанию;
- не подменять core PvE loop внешней ручной модерацией;
- не выдавать эксклюзивную силу через ручные GM-события.

Безопасная 1.0-форма: **Мастера испытаний** как authored/algorithmic framing для PvE-сцен. Они объясняют бой, школу и следующий tactical ask, но не создают FOMO, не меняют экономику и не требуют новой social/live-ops системы.

## 5.1. Exploration framework

Каждый регион имеет постоянные state-переменные:

- Threat;
- Need;
- Mystery;
- Corruption;
- Civilization Pressure;
- Faction Contest.

### Event generation

Каждая экспедиция генерирует события из weighted pools:

- threat event;
- opportunity event;
- moral dilemma;
- narrative hook;
- environmental modifier.

**Вес события = Базовый вес × Состояние региона × Смещение кармы × Влияние города × Недавняя история**

Безопасный 1.0-срез уже разделяет outcome шага исследования на battle encounter и standalone non-combat scene. Такие сцены дают темп, school-aware чтение мира и FOMO-safe framing Мастеров испытаний, но не выдают силу, не ставят таймеры и не подменяют core PvE loop.

## 5.2. Karma axis

Внутри системы хранится **Karma K ∈ [-100; +100]**.

### Threshold bands

- +100 … +60 — светлый / benevolent;
- +59 … +20 — принципиально добрый;
- +19 … -19 — прагматичный нейтрал;
- -20 … -59 — ruthless;
- -60 … -100 — malevolent / dominating.

## 5.3. Karma change formula

**ΔKarma = Moral Weight × Stakes × Visibility**

Где:

- Moral Weight — тяжесть действия;
- Stakes — масштаб последствий;
- Visibility — знают ли об этом мир и фракции.

## 5.4. Permanent consequences

Карма влияет на:

### NPC disposition

**Disposition = База + Этос фракции + Совпадение кармы + Личные флаги + Стояние в городе**

### Faction relations

- светлые пути усиливают trust у sanctum / relief структур;
- тёмные пути усиливают доступ к запретным сетям;
- прагматики получают больше flexible broker-paths.

### Narrative questlines

- high good → sanctuary restoration, refugee protection, purification lines;
- high evil → forbidden pacts, extortion, archive-of-ashes lines;
- pragmatic middle → broker, mercenary and dual-loyalty paths.

### Geographic access

- благие маршруты открывают sanctified zones;
- тёмные маршруты — forbidden catacombs и cursed sectors;
- нейтральные — hidden passes, broker routes и under-policed corridors.

## 5.5. No Trap Morality

Alignment не должен быть:

- ловушкой для аккаунта;
- тестом на “правильного человека”;
- схемой, где один моральный путь сильнее другого.

Обе стороны должны давать:

- power;
- fantasy;
- access;
- tradeoffs;
- долгосрочные последствия.

---

## 6. Pillar 4 — Living world ecosystem & player-driven societal growth

## 6.1. Restored cities as meta-progression engines

Каждый город имеет 5 ветвей роста:

- **Security**
- **Trade**
- **Craft**
- **Scholarship**
- **Community**

Эти ветви влияют на:

- маршруты;
- vendor quality;
- мастерские;
- mentor availability;
- частоту threat/opportunity events;
- civic contracts;
- school research unlocks.

## 6.2. City tiers

| Tier | State | Gameplay result |
|---|---|---|
| 0 | Руины | emergency services, высокая опасность |
| 1 | Лагерь | storage, базовые NPC, starter contracts |
| 2 | Поселение | guild board, мастерские, faction services |
| 3 | Восстановленный город | advanced services, mentors, tavern and archive spaces |
| 4 | Город-маяк | signature regional influence, high-tier civic projects |

## 6.3. City progression requirements

Для роста нужны:

- материалы;
- контракты безопасности;
- knowledge projects;
- восстановление дорог / мостов / башен;
- возврат населения и доверия.

### Milestone rule

Город поднимает tier только если:

1. закрыты численные thresholds;
2. выполнены ключевые проекты.

## 6.4. Player contribution

Игрок вносит вклад через:

- контракты;
- escort / convoy defense;
- восстановительные экспедиции;
- ремесленные поручения;
- faction diplomacy;
- оборону города;
- общественные строительные проекты.

### Personal reward

Игрок получает **Civic Standing** города, который открывает:

- скидки;
- приоритетные комиссии;
- tavern / archive perks;
- уникальные контракты;
- mentor dialogue;
- city-themed cosmetics и trophies.

## 6.5. Social and economic hubs

### Таверна

- rumor board;
- build-sharing;
- sponsored civic themes;
- recruitment hooks;
- social memory of the city.

### Магазин / мастерская

- commissions;
- rune recalibration;
- curated stock by city specialization;
- special project crafting.

### Гильдия

- expedition board;
- school challenges;
- civic planning;
- asynchronous cooperative tasks;
- build library.

### Архив / святилище

- doctrine shifts;
- lore unlocks;
- respec;
- ritual progression;
- consequence history.

## 6.6. Economy philosophy

Есть два контура экономики:

1. **Личный** — усилить персонажа сейчас;
2. **Городской** — вложиться в world growth и long-term unlocks.

Основные ресурсы:

- Essence;
- Rune Dust;
- Civic Materials;
- Relics;
- Marks.

Для 1.0 безопаснее использовать:

- regulated commissions;
- city markets;
- curated interaction points;

а не свободный player market.

---

## 7. Pillar 5 — Daily engagement loops & organic use-based growth

## 7.1. Daily Opportunity Board

Daily ecosystem строится не как список chores, а как **доска возможностей**.

Каждый день игрок получает 6 предложений:

- mastery objective;
- exploration objective;
- civic objective;
- social-lite objective;
- faction / narrative objective;
- hybrid build objective.

Игрок закрывает **любые 2** для полного daily payoff.

### Carryover rules

- пропущенные задачи не создают штраф;
- часть ценности уходит в reserve currency;
- до 3 задач могут перейти в weekly backlog.

## 7.2. Daily reward rules

Daily rewards могут давать:

- utility materials;
- civic materials;
- mastery acceleration;
- reroll tokens;
- cosmetics;
- lore fragments;
- local reputation.

Daily rewards не должны давать:

- exclusive power;
- unique one-day-only build-defining runes;
- irreplaceable ascension items;
- attendance-based parity advantage.

## 7.3. Use-based growth

Это passive-active growth layer: характеристики растут от meaningful действий.

### Organic attributes

- **Vitality** — переживание значимого урона;
- **Strength** — успешные удары, finishers, heavy follow-through;
- **Defence** — block, guard, mitigation under pressure;
- **Resolve** — resist, cleanse, magical survival;
- **Agility** — dodge, flanking, traversal, repositioning;
- **Attunement** — rune combos, efficient casting, exploiting telegraphs.

## 7.4. Growth formula

**Шанс роста = Base × Challenge × Relevance × Novelty × Success × Fatigue Modifier**

Где:

- Base — базовая вероятность;
- Challenge — trivial content режет gain;
- Relevance — уместное применение повышает gain;
- Novelty — повторение режет gain;
- Success — успешное решение даёт больше, чем бессмысленное действие;
- Fatigue Modifier — защита от repetitive grinding.

## 7.5. Soft caps

**Soft Cap = База тира + (Вложения в связанное дерево × 2) + Keystone Allowance**

Это не даёт use-based системе заменить всю structured progression.

## 7.6. Use-based system design rule

Система должна награждать:

- mastery;
- контекстное применение;
- разнообразие;
- encounter-solving intelligence.

Система не должна награждать:

- безопасный repetitive spam;
- low-risk grinding;
- attendance volume;
- macro-like farming.

---

## 8. System interaction summary

### Skill trees ↔ runes

- trees unlock capabilities and routing;
- runes change texture and tactical expression.

### Runes ↔ alignment

- alignment opens doctrine paths;
- changes who teaches / sells / trusts certain rune logic.

### Alignment ↔ cities

- moral direction shapes which districts thrive, who returns, and what civic identity forms.

### Cities ↔ exploration

- restored cities open routes, stabilize regions, change event tables and access to encounters.

### Daily board ↔ world-state

- daily content comes from the living world, not from detached chores.

### Use-based growth ↔ everything

- organic progression reinforces actual playstyle across combat, traversal, support and civic activity.

---

## 9. Ethical retention and anti-exploit guardrails

## Hard blockers

- exclusive power windows;
- streak reset systems;
- absence punishment;
- panic/guilt/FOMO copy;
- daily chores as mandatory power source;
- alignment-as-shame system;
- city decay caused by player absence;
- use-based growth that rewards repetitive low-risk labor.

## Positive retention goals

Игрок должен возвращаться ради:

- next goals;
- build hypotheses;
- new rune combinations;
- city restoration progress;
- meaningful narrative consequences;
- belonging and expression.

---

## 10. Recommended phasing

## 10.1. Strong 1.0 core

- deep branching progression;
- rune lattice and modular gear;
- ethical daily opportunity board;
- use-based organic growth;
- 1–2 restored cities;
- 2–3 clear karma thresholds;
- 2–3 exploration-rich regions with visible consequences.

## 10.2. Post-1.0 expansion

- more cities and city specializations;
- broader faction web;
- stronger geography locks by alignment;
- more doctrine-rune families;
- deeper civic economy;
- wider authored branching narrative.

## 10.3. Not a 1.0 blocker

- fully free player market;
- full societal simulation;
- universal deep reactive narrative web;
- massive breadth across all five pillars simultaneously.

---

## 11. Open validation questions

Перед переносом любого куска из этого vision в committed production scope нужно отдельно доказать:

1. Понимает ли игрок, где его главный прогресс?
2. Читается ли выгода от руны / узла / civic upgrade без вики?
3. Не ломает ли слой правило `basic attack is evergreen`?
4. Даёт ли редкость breadth, а не только цифры?
5. Дают ли moral choices реальные маршруты силы, а не moral trap?
6. Меняет ли restored city реальные опции игрока, а не просто косметику?
7. Не превращают ли daily/use-based growth игру в attendance-driven labor?

---

## 12. Final design rule

> Runemasters Return должен удерживать игрока не тем, что тот «обязан заходить», а тем, что он видит более глубокий билд, более живой мир и более интересное следующее решение.
