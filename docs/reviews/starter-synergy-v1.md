# Starter Synergy v1

> Historical first-slice review for Пламя/Твердь. Current four-school identity and combat expectations live in `docs/product/school-bible-v1.md`, `src/content/runes/data/*`, and the shipped runtime tests.

## Purpose

Сделать первый шаг от просто school mastery к **читаемому боевому комбо-паттерну** для locked Vertical Slice школ.

Scope этого среза специально узкий:

- только `Пламя`;
- только `Твердь`;
- только `same-school starter synergy`;
- без новых кнопок, без cross-school synergies, без proc-web сетки.

## Shipped rules

### Пламя — «Разогрев дожима»

- setup: игрок уже применил `Импульс углей`, и рунная техника Пламени находится на откате;
- payoff: базовая атака в окно добивания по цели ниже `50% HP` получает ещё один bonus;
- fantasy: сначала разогнал давление техникой, затем дожал базовой атакой.

### Твердь — «Ответ стойки»

- setup: игрок уже собрал `guard` через защиту или прошлый defensive ход;
- payoff: `Каменный отпор` из уже собранной стойки бьёт сильнее и крепче удерживает защиту;
- fantasy: сначала выдержал давление, затем ответил усиленным контрударом.

## Why this slice

- усиливает `Schools first` без нового UI слоя;
- сохраняет `Basic attack is evergreen`;
- даёт первое `setup -> payoff`, но без проц-хаоса и бесконечных циклов;
- не требует ещё одной прогрессионной системы поверх mastery v0.

## Out of scope

- cross-school synergy;
- новые active buttons;
- full doctrine tree;
- broad mastery rank ladder;
- распространение этих правил на Бурю / Прорицание до отдельного proof review.
