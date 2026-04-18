# Command Intent Rules v1

## Goal

Retry or duplicate delivery of the same guarded mutation must not turn one intended player action into two legitimate spends when the player has enough budget to pay twice.

## Scope v1

Covered by intent-based dedupe:

- `craftRune`
- `rerollRuneStat`
- `destroyRune`
- `allocateStatPoint`
- `resetAllocatedStats`
- `equipRune`
- `unequipRune`
- `skipTutorial`
- `returnToAdventure`
- keyboard battle actions (`attack`, `defend`, `runeSkill`)

Transport surface:

- VK keyboard payloads for guarded buttons;
- server-owned legacy text intents for `craftRune`, `rerollRuneStat`, `destroyRune`, `allocateStatPoint`, `resetAllocatedStats`, `equipRune`, `unequipRune`, `skipTutorial`, `returnToAdventure`.

Not covered yet:

- other free-text legacy commands outside rune mutations / profile stat allocation-reset;
- broader profile/progression mutations beyond stat allocation / reset;
- full repo-wide exact-once command handling.

## Core rule

Keyboard-issued mutation commands get an app-generated `intentId`.
Legacy text guarded mutations get a server-owned `intentId` from stable message metadata.
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

### Allocate stat point

- first arrival spends one свободное очко характеристики и сохраняет новый профиль;
- duplicate same-intent arrival returns the stored post-allocation profile instead of spending a second point.

### Reset allocated stats

- first arrival returns all потраченные очки характеристик exactly once;
- duplicate same-intent arrival returns the stored reset profile instead of refunding twice.

### Equip rune

- first arrival equips the currently selected rune from the rendered rune screen;
- duplicate same-intent arrival returns the stored post-equip loadout instead of reapplying against a fresher selection.

### Unequip rune

- first arrival clears the current equipped rune exactly once;
- duplicate same-intent arrival returns the stored post-unequip loadout instead of clearing a newer loadout state.

### Skip tutorial

- first arrival moves the player to the current adaptive adventure path and marks onboarding as skipped if it was still active;
- duplicate same-intent arrival returns the stored post-skip player state instead of reapplying the same navigation mutation.

### Return to adventure

- first arrival moves the player onto the current adaptive adventure path;
- duplicate same-intent arrival returns the stored post-return player state instead of overwriting fresher navigation state.

### Battle action

- first arrival resolves exactly one action from the rendered battle state;
- duplicate same-intent arrival returns the stored post-action battle result instead of resolving another turn;
- stale battle button restores the latest canonical battle view instead of replaying an old turn.

## Transport rule

- keyboard payload is the current source of intent ids;
- server-owned legacy text ids currently protect rune craft / reroll / destroy / equip / unequip, profile stat allocation / reset, and tutorial navigation (`пропустить обучение`, `в приключения`, `в мир`);
- keyboard battle buttons now carry scoped `intentId` + battle `stateKey`;
- each newly rendered mutation button gets a fresh `intentId`;
- old keyboard presses after state changes should be rejected as stale and ask the player to refresh the screen;
- other text aliases remain best-effort only until a later wider intent envelope slice.

## Tests required

- same-intent craft with enough shards for two crafts -> one craft only;
- same-intent reroll with enough shards for two rerolls -> one reroll only;
- same-intent destroy -> one refund only;
- same-intent stat allocation with enough free points for two spends -> one spend only;
- same-intent stat reset -> one refund only;
- same-intent equip -> one canonical equipped loadout only;
- same-intent unequip -> one canonical unequipped loadout only;
- same-intent skip tutorial -> one canonical post-skip navigation state only;
- same-intent return to adventure -> one canonical post-return navigation state only;
- same-intent battle attack / defend / rune skill -> one canonical post-action battle result only;
- stale reused intent after state change -> explicit `stale_command_intent` style rejection;
- different intent ids still allow honest repeated actions.

## Deferred after v1

- generic mutation intent envelope for all keyboard actions;
- remaining text-command replay handling beyond guarded rune mutations, profile stat allocation / reset, tutorial navigation, and keyboard battle actions;
- broader state-key strategy for non-rune mutations.
