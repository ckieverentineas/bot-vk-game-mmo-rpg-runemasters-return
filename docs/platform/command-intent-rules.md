# Command Intent Rules v1

## Goal

Retry or duplicate delivery of the same guarded mutation must not turn one intended player action into two legitimate spends when the player has enough budget to pay twice.

## Scope v1

Covered by intent-based dedupe:

- `craftRune`
- `rerollRuneStat`
- `destroyRune`
- `equipRune`
- `unequipRune`
- keyboard rune hub navigation (`previousRunePage`, `nextRunePage`, `selectRunePageSlot`)
- legacy text rune hub navigation (`+руна`, `-руна`, `руны >`, `руны <`, `руна слот 1..5` and aliases)
- `confirmDeletePlayer`
- `enterTutorialMode`
- `skipTutorial`
- `returnToAdventure`
- `exploreLocation`
- keyboard battle actions (`engageBattle`, `fleeBattle`, `attack`, `defend`, `runeSkill`)
- legacy text battle actions (`в бой`, `отступить`, `бой`, `начать бой`, `сражаться`, `бежать`, `атака`, `защита`, `навыки`, `спелл`)

Transport surface:

- VK keyboard payloads for guarded buttons;
- server-owned legacy text intents for `craftRune`, `rerollRuneStat`, `destroyRune`, `equipRune`, `unequipRune`, rune hub navigation (`+руна`, `-руна`, `руны >`, `руны <`, `руна слот 1..5` and aliases), `enterTutorialMode` (`локация`, `обучение`), `skipTutorial`, `returnToAdventure`, `exploreLocation` (`исследовать`), `engageBattle`, `fleeBattle`, `attack`, `defend`, `runeSkill`.

Not covered yet:

- other free-text legacy commands outside rune mutations;
- broader profile/progression mutations beyond the shipped school/rune flows;
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

Use `CommandIntentRecord` as the authoritative replay receipt for scoped commands that keep the player aggregate alive.
Use `DeletePlayerReceipt` as the authoritative replay receipt for delete confirmation, because successful apply removes the player row.

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

### Equip rune

- first arrival equips the currently selected rune from the rendered rune screen;
- duplicate same-intent arrival returns the stored post-equip loadout instead of reapplying against a fresher selection.

### Unequip rune

- first arrival clears the current equipped rune exactly once;
- duplicate same-intent arrival returns the stored post-unequip loadout instead of clearing a newer loadout state.

### Rune hub navigation

- first arrival updates the currently visible rune page or selected slot exactly once for the rendered rune hub snapshot;
- duplicate same-intent arrival returns the stored post-navigation rune hub state instead of retargeting a fresher selection;
- same-intent replay rules now also apply to legacy text rune navigation (`+руна`, `-руна`, `руны >`, `руны <`, `руна слот 1..5` and aliases), not only keyboard payloads;
- stale page or slot buttons restore the latest canonical rune hub instead of silently selecting another rune.

### Delete player confirmation

- first arrival deletes the currently confirmed player exactly once for the rendered profile snapshot;
- duplicate same-intent arrival returns the same canonical delete success instead of falling through `player_not_found` after the player row is gone;
- stale delete confirmation must never delete a newer player state or a re-registered character on the same VK account.

### Enter tutorial mode

- first arrival opens the current tutorial screen exactly once for the rendered exploration snapshot;
- duplicate same-intent arrival returns the stored tutorial-entry player state instead of overwriting fresher exploration progress;
- stale tutorial-entry button restores the latest tutorial/adventure context instead of snapping the player back to an older route.

### Skip tutorial

- first arrival moves the player to the current adaptive adventure path and marks onboarding as skipped if it was still active;
- duplicate same-intent arrival returns the stored post-skip player state instead of reapplying the same navigation mutation.

### Return to adventure

- first arrival moves the player onto the current adaptive adventure path;
- duplicate same-intent arrival returns the stored post-return player state instead of overwriting fresher navigation state.

### Explore location

- first arrival starts exactly one canonical exploration outcome for the rendered exploration state;
- duplicate same-intent arrival returns the stored outcome instead of minting a second event, encounter, or enemy selection;
- stale explore button restores the latest battle or exploration context instead of silently starting another fight.

### Battle action

- first arrival resolves exactly one action from the rendered battle state, including encounter `ENGAGE` / `FLEE` decisions;
- duplicate same-intent arrival returns the stored post-action battle result instead of resolving another turn;
- stale battle button restores the latest canonical battle view instead of replaying an old turn.

## Transport rule

- keyboard payload is the current source of intent ids;
- delete confirmation uses keyboard-issued `intentId` + profile `updatedAt` stateKey and is replayed through an account-scoped delete receipt;
- server-owned legacy text ids currently protect rune craft / reroll / destroy / equip / unequip, tutorial navigation (`пропустить обучение`, `в приключения`, `в мир`), and battle text inputs (`в бой`, `отступить`, `бой`, `начать бой`, `сражаться`, `бежать`, `атака`, `защита`, `навыки`, `спелл`);
- server-owned legacy text ids also protect rune hub navigation (`+руна`, `-руна`, `руны >`, `руны <`, `руна слот 1..5` and aliases);
- server-owned legacy text ids also protect tutorial entry via `локация` / `обучение`;
- server-owned legacy text ids also protect exploration entry via `исследовать`;
- keyboard battle buttons now carry scoped `intentId` + battle `stateKey`;
- keyboard rune hub page and slot buttons now also carry scoped `intentId` + rune-hub `stateKey`;
- keyboard explore buttons now also carry scoped `intentId` + exploration `stateKey`;
- each newly rendered mutation button gets a fresh `intentId`;
- old keyboard presses after state changes should be rejected as stale and ask the player to refresh the screen;
- other text aliases remain best-effort only until a later wider intent envelope slice.

## Tests required

- same-intent craft with enough shards for two crafts -> one craft only;
- same-intent reroll with enough shards for two rerolls -> one reroll only;
- same-intent destroy -> one refund only;
- same-intent equip -> one canonical equipped loadout only;
- same-intent unequip -> one canonical unequipped loadout only;
- same-intent skip tutorial -> one canonical post-skip navigation state only;
- same-intent return to adventure -> one canonical post-return navigation state only;
- same-intent battle engage / flee / attack / defend / rune skill -> one canonical post-action battle result only;
- same-intent rune page / slot navigation -> one canonical post-navigation rune hub state only;
- same-intent legacy text rune navigation -> one canonical post-navigation rune hub state only;
- same-intent delete confirmation -> one canonical delete success only;
- same-intent tutorial entry from main menu / legacy text -> one canonical tutorial context only;
- same-intent explore from main menu / tutorial / battle-result CTA -> one canonical exploration outcome only;
- stale reused intent after state change -> explicit `stale_command_intent` style rejection;
- different intent ids still allow honest repeated actions.

## Deferred after v1

- generic mutation intent envelope implementation after the design in `docs/platform/generic-mutation-intent-envelope.md`;
- remaining text-command replay handling beyond guarded rune mutations, tutorial navigation, exploration entry, and battle actions;
- broader state-key strategy for future non-rune mutations that are not already covered by exploration, battle, quest reward, pending reward, or delete receipts.
