# Support Rune Slot v2

## Purpose

Сделать support-slot не только контейнером для половины статов, но и первым **реально боевым пассивным вкладом** без преждевременного перехода в multi-skill chaos.

## Locked rules

- `slot 0` остаётся единственным источником активной боевой руны;
- `slot 1` остаётся passive-only support layer;
- support-slot теперь даёт:
  - половину статов,
  - **один ограниченный passive contribution**;
- current one-active rule = **readability budget сейчас**, а не постоянный запрет на future multi-skill combat.

## Shipped passive support rules

- **Пламя**: support rune с `ember_heart` добавляет ещё 1 давление к базовой атаке primary Пламени;
- **Твердь**: support rune с `stone_guard` добавляет ещё 1 guard к defensive tempo primary Тверди.

## Why this slice

- делает support rune реально заметной в бою уже сейчас;
- усиливает school feel без второй активной кнопки;
- не ломает текущий battle budget и не вводит dual-cast semantics;
- оставляет future multi-skill как отдельное решение, а не как скрытую поломку этого среза.

## Explicitly out of scope

- вторая активная кнопка в бою;
- каст support rune как отдельного действия;
- cross-slot proc-web chains;
- multi-action sequencing внутри одного хода;
- расширение beyond bounded passive modifiers для этого slice.
