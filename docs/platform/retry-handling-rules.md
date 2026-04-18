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
- keyboard battle buttons (`атака`, `защита`, `рунное действие`) теперь дополнительно идут через scoped `intentId` + battle `stateKey`;
- duplicate same-intent battle input обязан вернуть canonical persisted battle result, а не провести второй turn resolution;
- stale или retry-pending battle input обязан оставлять игрока внутри актуального battle context, а не выбрасывать в меню.

## Victory reward rules

- победная награда фиксируется через versioned `RewardIntent`;
- exact-once economic side effect фиксируется в `RewardLedgerRecord` по unique `ledgerKey`;
- retry после уже завершённой победы обязан вернуть canonical persisted result, а не перероллить награду локально.

## Rune mutation rules

- craft / reroll / destroy идут через guarded repository mutations;
- если второго бюджета уже нет, повторная команда должна закончиться deterministic error (`not_enough_shards` / `rune_not_found`), а не частичным second apply;
- inventory не должен уходить в отрицательные значения даже при parallel submit.
- keyboard-issued rune mutations дополнительно идут через `intentId`; повтор того же intent обязан вернуть canonical stored result, а не второй spend.
- legacy text `создать` / `сломать` / `~stat` теперь получают server-owned message intent id и используют тот же canonical replay receipt.
- keyboard-issued `equipRune` / `unequipRune` дополнительно привязываются к loadout `stateKey`, чтобы старое сообщение не могло экипировать или снять уже другую руну.
- legacy text `надеть` / `снять` получают server-owned message intent id и повторно возвращают canonical loadout result вместо второго применения той же команды.

## Profile mutation rules

- `allocateStatPoint` и `resetAllocatedStats` используют keyboard-issued `intentId` + profile `stateKey`;
- plain text `+атк` / `+здр` / `+фзащ` / `+мзащ` / `+лвк` / `+инт` / `сброс` получают server-owned message intent id и тоже идут через canonical replay receipt;
- stateKey привязан к `allocationPoints`, `unspentStatPoints` и целевой характеристике там, где это важно;
- duplicate same-intent profile mutation обязан вернуть canonical stored profile, а не второй spend/refund;
- stale profile button после уже применённого изменения обязан быть отклонён как `stale_command_intent`, а не применён поверх нового профиля.

## Exploration navigation rules

- `skipTutorial` и `returnToAdventure` используют keyboard-issued `intentId` + exploration `stateKey`;
- plain text `пропустить обучение`, `в приключения` и alias `в мир` получают server-owned message intent id и идут через canonical replay receipt;
- stateKey привязан к `tutorialState`, `activeBattleId`, текущему `locationLevel`, streak state и adaptive adventure destination;
- duplicate same-intent navigation command обязан вернуть canonical post-navigation player state, а не повторно перетереть более свежий exploration state;
- stale tutorial-navigation command после уже изменившегося состояния обязан восстанавливать актуальный tutorial/adventure контекст, а не выбрасывать игрока в общий main menu.
- tutorial-navigation mutation не должна применяться поверх активного боя; сначала игрок завершает текущий бой, затем меняет маршрут приключения.

## Player-facing rules

- duplicate battle input по умолчанию восстанавливается через latest canonical battle state;
- stale branch не тратит дополнительные ресурсы и не продвигает ход;
- если бой уже завершён, игрок видит актуальный финальный результат, а не техническую ошибку.
- stale / retry profile и rune mutations по возможности восстанавливают актуальный профильный или рунный контекст вместо выброса в главное меню.
- stale equip / unequip reply обязан показывать актуальную рунную сборку, чтобы игрок сразу видел, какая руна реально экипирована сейчас.
- stale / retry tutorial-navigation reply обязан восстанавливать актуальный tutorial/adventure экран с правильным следующим CTA.

## Logging

- stale active-battle rejection пишет `battle_stale_action_rejected` в `GameLog` с `battleId`, `expectedRevision` и `actualRevision`;
- applied victory reward пишет `reward_claim_applied` с `ledgerKey` и source metadata.

## Known next-step gaps

- explicit RNG authority rules for reroll / drop / craft are now defined in `docs/platform/rng-authority-rules.md`, but broader legacy-text and non-profile command replay still remains;
- migration fixtures for versioned persisted contracts;
- remaining legacy text-command repeated actions beyond guarded rune mutations / profile stat allocation / reset / tutorial navigation / keyboard battle actions, plus non-rune mutations beyond rune loadout buttons.
