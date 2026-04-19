# Progression Rework v1

## Problem

Текущее level-up распределение `+АТК/+ЗДР/+ФЗАЩ/+МЗАЩ/+ЛВК/+ИНТ` быстро превращается в:

- ложный выбор вместо нового стиля боя;
- слабую school identity;
- housekeeping-цель в профиле вместо return hook;
- шум для adaptive difficulty и future progression balancing.

## Decision

Для ближайшего среза игра уходит от **новых stat points за уровни** и смещает progression в сторону **school mastery**.

## Shipped first slice

- новые уровни больше не начисляют новые `unspentStatPoints`;
- новые игроки теперь стартуют без новых stat points и не получают старую profile-ветку по умолчанию;
- school mastery v0 растёт за победы с экипированной руной школы;
- rank 1 у текущих школ даёт маленький, но **не плоский** боевой payoff;
- старые `allocationPoints` и оставшиеся `unspentStatPoints` пока сохраняются как compatibility layer для существующих профилей.

## Why this slice

Это минимальный безопасный шаг, который:

- не ломает старые сейвы big-bang миграцией;
- даёт новую progression-ось через школы, а не голые числа;
- уменьшает значимость старой stat-allocation UX без резкого обнуления старых персонажей.

## Deferred after v1

- полный skill tree / doctrine layer;
- конвертация legacy allocation в новую систему;
- player-state versioning policy для полного удаления старых stat-point полей;
- school mastery depth beyond first rank / first unlock layer.
