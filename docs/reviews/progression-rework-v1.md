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
- ближайшая mastery-веха теперь используется как canonical next-goal framing для `main menu`, `return recap`, `rune hub` и `battle result`, а не остаётся скрытой только в системном прогрессе;
- legacy stat-allocation полностью удалена из runtime, persistence, UI и transport-команд.

## Why this slice

Это минимальный шаг, который дал новую progression-ось через школы и подготовил безопасный полный cut старой системы:

- даёт новую progression-ось через школы, а не голые числа;
- даёт не только новую progression-ось, но и честный return hook: игрок видит ближайшую school-веху и понимает, зачем идти в следующий бой;
- сначала уменьшил значимость старой stat-allocation UX;
- а затем позволил отдельным breaking-change slice полностью удалить legacy stat-allocation и сделать clean DB wipe до тестового запуска.

## Deferred after v1

- полный skill tree / doctrine layer;
- player-state versioning policy для полного удаления старых stat-point полей;
- school mastery depth beyond first rank / first unlock layer.
