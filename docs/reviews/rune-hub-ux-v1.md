# Rune Hub UX v1

## Purpose

Сделать rune hub быстрым и понятным в chat UX без преждевременного расширения loadout-модели.

## Locked decisions

- на экране сразу видно **5 рун на странице**;
- игрок всегда видит, какая руна **выбрана** и какая **надета**;
- в текущем срезе открыт только **1 слот экипировки**;
- extra rune slots допускаются только как future progression direction после отдельного review, а не как текущая runtime-механика.

## Why this slice

- убирает путаницу между `selected rune` и `equipped rune`;
- поддерживает быстрый выбор в `1–2` нажатия;
- не ломает текущие persistence и battle contracts single-slot loadout;
- оставляет чистый мост к будущему growth без лишней сложности прямо сейчас.

## Explicitly out of scope

- multi-slot loadout уже сейчас;
- отдельные боевые роли по slot-номерам;
- slot unlocks как живая progression-механика в этом slice;
- сложные presets, drag/drop, compare matrix, cross-slot interactions.
