# Command Intent Rules v1

## Goal

Retry or duplicate delivery of the same keyboard mutation must not turn one intended player action into two legitimate spends when the player has enough budget to pay twice.

## Scope v1

Covered by intent-based dedupe:

- `craftRune`
- `rerollRuneStat`
- `destroyRune`

Transport surface:

- VK keyboard payloads only

Not covered yet:

- free-text legacy commands without payload intent ids;
- all profile/progression mutations;
- full repo-wide exact-once command handling.

## Core rule

Keyboard-issued mutation commands get an app-generated `intentId`.
Use-case layer additionally derives a `stateKey` from the current relevant player/rune state before mutation.

For the same:

- `playerId`
- `intentId`
- `stateKey`

the server must:

- apply the mutation at most once;
- persist a canonical result snapshot;
- return that same snapshot on duplicate replay instead of spending again.

If the same `intentId` arrives after the relevant state already changed, the command must be rejected as a stale button press instead of being treated as a new action.

## Persistence rule

Use `CommandIntentRecord` as the authoritative replay receipt for scoped commands.

Fields of interest:

- `playerId`
- `intentId`
- `commandKey`
- `stateKey`
- `status`
- `resultSnapshot`

## Flow rules

### Craft

- first arrival spends shards and persists one created rune;
- duplicate same-intent arrival returns the stored post-craft player snapshot.

### Reroll

- first arrival spends one shard and persists one reroll result;
- duplicate same-intent arrival returns the stored post-reroll snapshot, not a second reroll.

### Destroy

- first arrival deletes the rune and applies one refund;
- duplicate same-intent arrival returns the stored post-destroy snapshot, not a second refund.

## Transport rule

- keyboard payload is the current source of intent ids;
- each newly rendered mutation button gets a fresh `intentId`;
- old keyboard presses after state changes should be rejected as stale and ask the player to refresh the screen;
- text aliases remain best-effort only until a later wider intent envelope slice.

## Tests required

- same-intent craft with enough shards for two crafts -> one craft only;
- same-intent reroll with enough shards for two rerolls -> one reroll only;
- same-intent destroy -> one refund only;
- stale reused intent after state change -> explicit `stale_command_intent` style rejection;
- different intent ids still allow honest repeated actions.

## Deferred after v1

- stat-allocation intent dedupe;
- generic mutation intent envelope for all keyboard actions;
- text-command replay handling;
- broader state-key strategy for non-rune mutations.
