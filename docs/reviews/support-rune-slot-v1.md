# Support Rune Slot v1

> Исторический baseline slice. Актуальное боевое развитие поддержки продолжено в `docs/reviews/support-rune-slot-v2.md`.

## Purpose

Дать первый реальный шаг к `pre-battle loadout decisions` без взрыва боевого интерфейса.

## Locked rules

- mastery milestone теперь может открыть **2-й слот рун**;
- `slot 0` = **основа**;
- `slot 1` = **поддержка**;
- только **основа** даёт активную боевую кнопку и определяет primary school combat loop;
- **поддержка** не даёт вторую кнопку и не живёт как отдельный action source;
- поддержка даёт только **половину статов** выбранной руны как pre-battle breadth.

## Unlock rule

- support-slot открывается, когда игрок достигает первой mastery-вехи любой школы;
- это первый ощутимый progression payoff ширины сборки, а не ещё одна голая level-up прибавка.

## Why this slice

- усиливает `Rarity expands loadout breadth`;
- добавляет реальный loadout choice без dual-cast хаоса;
- сохраняет `Basic attack is evergreen` и single active rune clarity;
- использует уже существующую slot-aware foundation, не ломая бой второй активкой.

## Explicitly out of scope

- третьи и последующие слоты;
- вторая активная руна в бою;
- slot swap mid-battle;
- proc-web cross-slot combos;
- slot-specific currencies или отдельное дерево unlock'ов.
