# Rarity Ladder v1

## Status

- Status: `product lock v1`
- Purpose: закрыть early rarity ladder для Vertical Slice и Phase 1 product lock.
- Scope: `USUAL`, `UNUSUAL`, `RARE`.
- Source references: `docs/reviews/phase-1-exit-gate.md`, `docs/product/deep-progression-rpg-vision.md`.

## Boundary

Этот документ фиксирует продуктовый смысл ранних редкостей, а не баланс-формулы.

Не меняются:

- drop weights;
- shard economy;
- stat roll caps;
- reward formulas;
- late rarity tiers `EPIC`, `LEGENDARY`, `MYTHICAL`.

## Core rule

Редкость должна расширять сборку и milestone meaning, а не быть только большей цифрой.

Каждый ранний tier отвечает на отдельный вопрос игрока:

- `USUAL`: какая школа и базовый стиль у меня появились?
- `UNUSUAL`: какой первый школьный знак доказал, что я понял раннее испытание?
- `RARE`: какая первая печать делает стиль заметным build breakpoint?

## Early ladder

| Runtime tier | Игровой tier | Early payoff role | Primary source | Product promise | Не должен означать |
|---|---|---|---|---|---|
| `USUAL` | Обычная руна | First usable sign | onboarding, craft, early drops | открывает школу, базовую роль и первый реальный loadout choice | одноразовый проходной tier |
| `UNUSUAL` | Необычная руна | First school sign | school novice elite payoff | подтверждает, что игрок прочитал раннее school-specific испытание | просто чуть больше статов |
| `RARE` | Редкая руна | First school seal | school miniboss continuation | превращает первый знак в ранний build breakpoint и повод сверить экипировку | обязательный power cliff |

## Tier details

### `USUAL` - First usable sign

`USUAL` руна должна ощущаться как первый настоящий инструмент, а не как мусор до "реальной" игры.

Она может:

- открыть школу и её archetype identity;
- дать понятный stat/support profile;
- показать passive или active payoff, если он уже есть у archetype;
- стать честным первым кандидатом на экипировку.

Она не обязана:

- быть optimal надолго;
- закрывать school fantasy полностью;
- давать сложную synergy.

### `UNUSUAL` - First school sign

`UNUSUAL` в ранней игре является первым школьным признанием.

Для school-first slice это означает:

- игрок уже вошёл в выбранную school lane;
- novice elite encounter проверил базовый tactical ask школы;
- reward должен быть aligned со школой и читаться как первый знак пути.

`UNUSUAL` не должен продаваться только как upgrade. Его работа - сказать: "ты понял первый урок этой школы, теперь попробуй носить этот знак в сборке".

### `RARE` - First school seal

`RARE` в ранней игре является первой печатью школы.

Для locked Vertical Slice это означает:

- игрок уже получил первый `UNUSUAL` знак;
- следующий school miniboss проверяет, стал ли знак реальной боевой сборкой;
- rare reward должен ощущаться как build breakpoint, а не как конец прогрессии.

`RARE` может быть сильнее и выразительнее, но не должен делать предыдущий tier бессмысленным или заставлять игрока считать весь early loop черновиком.

## Current implementation notes

Текущее runtime-представление уже поддерживает эту лестницу:

- `USUAL`, `UNUSUAL`, `RARE` имеют отдельные shard fields и player-facing titles в `gameBalance.runes.profiles`;
- school novice path ведёт к `UNUSUAL` reward;
- school miniboss continuation ведёт к `RARE` reward;
- acquisition / next-goal copy уже различает first sign и seal language.

Эти факты являются evidence для product lock, но не превращают числа в immutable balance contract.

## Copy rules

- `USUAL` описывать как первый рабочий знак/руну, не как мусорную заготовку.
- `UNUSUAL` описывать как первый знак школы и первый доказанный school payoff.
- `RARE` описывать как печать школы и ранний build breakpoint.
- При объяснении редкости повторять мысль: "новая редкость расширяет сборку, а не только цифры".
- Не обещать, что каждая новая редкость всегда открывает новую кнопку или отдельную механику.

## Validation expectations

- School novice reward должен оставаться `UNUSUAL`, пока не принят новый product review.
- School miniboss reward должен оставаться `RARE`, пока не принят новый product review.
- Release evidence должен различать `UNUSUAL reward` и `RARE seal`.
- Любой будущий formula/tuning pass обязан сохранять смысл tier ladder или явно обновить этот документ.

## Deferred

`EPIC`, `LEGENDARY` и `MYTHICAL` остаются вне этого lock.

Их будущая роль должна проходить отдельный review, потому что late rarity tiers легко превращаются в raw-power ladder, economy pressure или build-defining scarcity без достаточного evidence.
