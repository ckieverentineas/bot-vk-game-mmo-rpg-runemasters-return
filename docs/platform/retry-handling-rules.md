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
- plain text `атака`, `защита`, `навыки` и `спелл` получают server-owned message intent id и используют тот же canonical replay receipt;
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
- keyboard-issued `руны >` / `руны <` / `руна слот 1..5` дополнительно привязываются к rune-hub `stateKey`, чтобы старый экран не мог тихо выбрать уже другую руну или другую страницу.
- legacy text `+руна` / `-руна` / `руны >` / `руны <` / `руна слот 1..5` и alias теперь тоже получают server-owned message intent id и используют тот же canonical replay receipt.
- stale или retry-pending rune page/slot input обязан восстанавливать актуальный rune hub вместо silent retargeting.

## Destructive confirmation rules

- `__confirm_delete_player__` использует keyboard-issued `intentId` + profile `updatedAt` stateKey;
- delete confirm replay хранится в account-scoped `DeletePlayerReceipt`, чтобы canonical success переживал удаление player row;
- duplicate same-intent delete confirm обязан вернуть тот же success-ack, а не `player_not_found` или вторую попытку удаления;
- stale delete confirm не должен удалять более свежего персонажа или нового героя, созданного после удаления на том же `vkId`.

## Exploration navigation rules

- `location` / `локация` / `обучение` используют keyboard-issued `intentId` + exploration `stateKey` либо server-owned legacy text intent id;
- duplicate same-intent `location` обязан вернуть canonical tutorial-entry player state, а не повторно перетереть более свежий exploration state;
- stale tutorial-entry input после уже изменившегося exploration state обязан восстановить актуальный tutorial/adventure контекст, а не вернуть игрока на устаревший экран обучения;
- `explore` / `исследовать` используют keyboard-issued `intentId` + exploration `stateKey` либо server-owned legacy text intent id;
- duplicate same-intent `explore` обязан вернуть canonical persisted battle, а не создать второй encounter или перероллить врага;
- stale explore input после уже изменившегося exploration state обязан вернуть игрока в актуальный battle/location context, а не стартовать новый бой поверх свежего состояния;
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
- stale / retry tutorial-entry reply обязан восстанавливать актуальный tutorial/adventure экран с понятным следующим CTA.
- stale / retry tutorial-navigation reply обязан восстанавливать актуальный tutorial/adventure экран с правильным следующим CTA.
- stale / retry explore reply обязан восстанавливать либо текущий бой, либо актуальный exploration screen с правильной кнопкой следующего боя.
- duplicate delete confirm reply обязан повторять каноническое сообщение об успешном удалении и оставлять игрока на entry CTA.

## Logging

- stale active-battle rejection пишет `battle_stale_action_rejected` в `GameLog` с `battleId`, `expectedRevision` и `actualRevision`;
- applied victory reward пишет `reward_claim_applied` с `ledgerKey` и source metadata.

## Known next-step gaps

- explicit RNG authority rules for reroll / drop / craft are now defined in `docs/platform/rng-authority-rules.md`, but broader legacy-text and non-profile command replay still remains;
- migration fixtures for versioned persisted contracts;
- remaining legacy text-command repeated actions beyond guarded rune mutations / tutorial navigation / exploration entry / battle actions, plus non-rune mutations beyond guarded rune loadout buttons; delete confirmation exact-once is now covered.
