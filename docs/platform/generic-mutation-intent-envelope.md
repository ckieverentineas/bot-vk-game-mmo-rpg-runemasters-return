# Generic Mutation Intent Envelope Design v1

## Status

- Status: `document-first design slice`
- Scope: generic mutation intent envelope, remaining command-family inventory, and one narrow implementation candidate.
- Runtime impact: no code change, no schema change, no Prisma migration.
- Source references: `docs/platform/command-intent-rules.md`, `docs/platform/retry-handling-rules.md`, `docs/platform/state-read-model-boundaries.md`.

## Goal

The current command intent rail protects the highest-risk shipped mutations, but the shape is still scattered:

- keyboard payloads carry flat `{ command, intentId, stateKey }`;
- legacy text intents are matched in `src/vk/router/commandRouter.ts`;
- routes decide which use-case receives `intentId` and `stateKey`;
- repository methods each name their own `CommandIntentRecord` command key;
- reward-bearing flows sometimes use a domain ledger instead of `CommandIntentRecord`.

The generic envelope design should make every mutation-capable command declare the same metadata: command family, state-key kind, receipt owner, replay behavior, and stale recovery behavior.

This is a design slice only. It prepares the next implementation without moving every command at once.

## Current baseline

Already protected by command-intent or domain-ledger semantics:

- rune craft, reroll, destroy;
- rune equip and unequip;
- rune hub page and slot navigation;
- delete confirmation through `DeletePlayerReceipt`;
- tutorial entry, tutorial skip, return to adventure;
- exploration entry and battle creation;
- battle engage, flee, attack, defend, rune skill;
- pending trophy reward claims through reward ledger and ledger-scoped buttons;
- quest reward claim through quest reward ledger and quest-code state key.

Current flat payload remains valid:

```ts
{
  command: string;
  intentId?: string;
  stateKey?: string;
}
```

Current legacy text intent remains valid where explicitly whitelisted.

## Design rule

A generic mutation intent envelope is a server-resolved contract, not blindly trusted client data.

Transport may carry an `intentId` and `stateKey`, but the server must resolve the authoritative command family and receipt owner from a local registry. Payload metadata can identify the player's rendered button; it cannot choose reward, economy, or persistence behavior.

## Proposed envelope model

The first generic model should separate payload shape from resolved server meaning.

### Transport payload

The current flat payload can remain the wire format during the first implementation:

```ts
interface TransportCommandPayloadV1 {
  readonly command: string;
  readonly intentId?: string;
  readonly stateKey?: string;
}
```

A future wire-format migration may add `schemaVersion`, but it is not required for the first slice because changing every keyboard payload would be too broad.

### Resolved mutation envelope

The server should build a richer resolved value after command normalization:

```ts
type MutationIntentReceiptOwner =
  | 'CommandIntentRecord'
  | 'DeletePlayerReceipt'
  | 'RewardLedgerRecord'
  | 'none';

type MutationIntentFamily =
  | 'read_only'
  | 'account_lifecycle'
  | 'profile_navigation'
  | 'quest_book'
  | 'pending_reward'
  | 'rune_navigation'
  | 'rune_mutation'
  | 'exploration'
  | 'battle';

interface ResolvedMutationIntentEnvelope {
  readonly command: string;
  readonly intentId: string | null;
  readonly stateKey: string | null;
  readonly intentSource: 'payload' | 'legacy_text' | null;
  readonly family: MutationIntentFamily;
  readonly receiptOwner: MutationIntentReceiptOwner;
  readonly stateKeyKind: string | null;
  readonly requiresIntent: boolean;
  readonly supportsLegacyTextIntent: boolean;
}
```

The concrete TypeScript names can change during implementation, but the separation should stay:

- payload parsing remains transport-owned;
- command family classification is server-owned;
- domain state-key builders remain domain-owned;
- persistence receipt owner remains application/repository-owned.

## Remaining command families

| Family | Commands and aliases | Current guard | Envelope decision |
|---|---|---|---|
| Entry and account lifecycle | `start`, `deletePlayer`, `confirmDeletePlayer` | `confirmDeletePlayer` uses `DeletePlayerReceipt`; `start` is not exact-once guarded | Keep `confirmDeletePlayer` in dedicated receipt owner. Do not add generic replay to `start` until duplicate registration has a real bug or migration need. |
| Read-only home/profile/inventory | `backToMenu`, `profile`, `inventory` | No mutation receipt | Classify as `read_only`; no `intentId` required. |
| Quest book open | `questBook` and quest aliases | No mutation receipt | Classify as `read_only`; opening the book should not mutate quest state. |
| Quest reward claim | `claimQuestReward` | Quest reward ledger, quest-code state key | Keep receipt owner as `RewardLedgerRecord`; candidate for generic resolved envelope because it is reward-bearing but not a `CommandIntentRecord` flow. |
| Pending reward screen | `pendingReward` and aliases | No mutation receipt for open screen | Classify open screen as `read_only`; the claim buttons are separate. |
| Pending trophy reward claim | `collectAllReward`, trophy action commands | Reward ledger, ledger-key state key | Keep receipt owner as `RewardLedgerRecord`; classify as `pending_reward`. Do not duplicate this with `CommandIntentRecord`. |
| Rune screens | `runeCollection`, `altar`, `rerollRuneMenu` | No mutation receipt for open screens | Classify as `read_only` or `profile_navigation`; no `intentId` required. |
| Rune navigation | `nextRune`, `previousRune`, page commands, slot commands and aliases | `CommandIntentRecord` for page/slot navigation | Keep guarded. Generic envelope should describe `stateKeyKind = rune_cursor` or `rune_page_slot`. |
| Rune mutations | `craftRune`, `rerollRuneStat`, `destroyRune`, `equipRune`, `unequipRune` and aliases | `CommandIntentRecord` | Keep guarded. Generic envelope should describe command key and stale recovery target. |
| Tutorial and exploration | `location`, `skipTutorial`, `returnToAdventure`, `explore` and aliases | `CommandIntentRecord` | Keep guarded. Generic envelope should separate tutorial-entry, skip, return, and explore state-key kinds. |
| Battle actions | `engageBattle`, `fleeBattle`, `attack`, `defend`, `skills`, skill slot aliases | `CommandIntentRecord` plus battle `actionRevision` | Keep guarded. Generic envelope should include battle action state-key kind and recovery target. |
| Remaining legacy text navigation | menu/profile/inventory/quest/pending reward/rune screen open aliases | Best effort only | Do not add server-owned legacy text intents for read-only commands. Add only when a command mutates source-of-truth state. |
| Future branching systems | future quest choices, social actions, PvP, trade, season claim, doctrine choice | Not shipped | Must define family, receipt owner, state-key kind, replay behavior, and stale recovery before implementation. |

## Receipt-owner rule

Generic envelope must not mean generic persistence for every mutation.

- Use `CommandIntentRecord` when one player aggregate survives and the replay result is a command output snapshot.
- Use `DeletePlayerReceipt` when the mutation removes the player row and replay must survive `player_not_found`.
- Use `RewardLedgerRecord` when exact-once economic reward application is already keyed by reward source.
- Use no receipt for read-only screen navigation.

If a future command needs a new receipt owner, document it before runtime code lands.

## State-key rule

Every mutation family must name what makes a rendered command stale.

Examples:

- `profile_updated_at` for delete confirmation;
- `rune_cursor`, `rune_page_slot`, `rune_selected_id`, or `rune_loadout_slot` for rune flows;
- `exploration_progress` for tutorial/explore commands;
- `battle_action_revision` for battle actions;
- `quest_code` for quest claim readiness;
- `reward_ledger_key` for pending reward claims.

The state key should be a stable digest or explicit string from server-owned state. It should not be presenter copy, telemetry, button label text, or client-provided business data.

## Approaches considered

### Approach A: Replace all keyboard payloads with a new versioned payload

This gives a clean wire contract, but it touches every keyboard surface and every payload test in one slice. It also risks breaking old messages that still contain the flat payload.

Decision: not first.

### Approach B: Add a server-side resolved envelope registry first

Keep the current flat payload and legacy text behavior, but introduce a single registry that classifies commands by family, receipt owner, state-key kind, and intent requirements. Routes can then consume a richer `CommandIntentContext` without changing every button payload.

Decision: recommended first implementation.

### Approach C: Move every mutation to `CommandIntentRecord`

This sounds simple, but it would duplicate reward-ledger semantics for quest and pending reward claims. It also blurs source-of-truth ownership.

Decision: reject.

## Narrow implementation candidate

Implement **server-side resolved envelope registry only**.

Scope for the candidate:

- add a small `mutationIntentRegistry` near `src/vk/router/commandRouter.ts` or `src/vk/handlers/gameCommandRouteKit.ts`;
- classify existing commands into the families listed above;
- extend `ResolvedCommandEnvelope` or `CommandIntentContext` with resolved metadata;
- keep the current flat payload shape;
- keep all existing receipt owners;
- add tests that prove:
  - read-only commands classify as `receiptOwner = none`;
  - rune/battle/exploration commands classify as `CommandIntentRecord`;
  - delete confirmation classifies as `DeletePlayerReceipt`;
  - quest and pending reward claims classify as `RewardLedgerRecord`;
  - unsupported legacy text remains unguarded unless explicitly listed.

Out of scope for the candidate:

- changing Prisma schema;
- changing `CommandIntentRecord` columns;
- changing reward ledger semantics;
- changing all keyboard payloads to a versioned wire format;
- adding new gameplay commands.

## Acceptance gates for future implementation

- `docs/platform/command-intent-rules.md` remains synced with the registry.
- Existing command-intent tests keep passing.
- Keyboard payload tests prove no partial envelope is emitted.
- Router tests cover payload, legacy text, read-only, and unsupported commands.
- Reward-bearing flows do not get double receipts.
- `npm run check` passes.

## Verification for Q-040

Docs-only verification is sufficient for Q-040 because this slice defines the design and does not change runtime behavior.

Required checks:

- `npm run release:preflight`;
- `git diff --check`;
- `git diff --cached --check` after staging.
