# Retry Handling Rules v1

## Goal

Повторная команда, повторная доставка transport-события и race между двумя запросами не должны давать игроку больше ценности, чем один честный action resolution.

## Battle mutation rules

- `BattleSession.actionRevision` — server-authoritative revision активного боя;
- `saveBattle()` и `finalizeBattle()` применяют mutation только если совпадают:
  - `battle.id`
  - `playerId`
  - `status = ACTIVE`
  - `actionRevision = expectedRevision`
- успешная mutation увеличивает `actionRevision` на `1`;
- stale branch не перезаписывает новый state и получает canonical latest battle из persistence.

## Victory reward rules

- победная награда фиксируется через versioned `RewardIntent`;
- exact-once economic side effect фиксируется в `RewardLedgerRecord` по unique `ledgerKey`;
- retry после уже завершённой победы обязан вернуть canonical persisted result, а не перероллить награду локально.

## Rune mutation rules

- craft / reroll / destroy идут через guarded repository mutations;
- если второго бюджета уже нет, повторная команда должна закончиться deterministic error (`not_enough_shards` / `rune_not_found`), а не частичным second apply;
- inventory не должен уходить в отрицательные значения даже при parallel submit.

## Player-facing rules

- duplicate battle input по умолчанию восстанавливается через latest canonical battle state;
- stale branch не тратит дополнительные ресурсы и не продвигает ход;
- если бой уже завершён, игрок видит актуальный финальный результат, а не техническую ошибку.

## Logging

- stale active-battle rejection пишет `battle_stale_action_rejected` в `GameLog` с `battleId`, `expectedRevision` и `actualRevision`;
- applied victory reward пишет `reward_claim_applied` с `ledgerKey` и source metadata.

## Known next-step gaps

- explicit RNG authority rules for reroll / drop / craft are now defined in `docs/platform/rng-authority-rules.md`, but broader idempotent command replay still remains;
- migration fixtures for versioned persisted contracts;
- broader dedupe policy for multi-budget repeated commands outside the critical one-budget rails.
