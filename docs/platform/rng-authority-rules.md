# RNG Authority Rules v1

## Goal

Reward-relevant randomness must be resolved once on the server, before persistence, and the persisted outcome must stay canonical for retries, recovery, and review.

## In scope

- rune craft generation;
- rune stat reroll outcome;
- victory rune drop outcome.

## Out of scope

- combat damage randomness;
- general encounter composition randomness outside the shipped `exploreLocation` command receipt;
- analytics/vendor specifics;
- generic replay-safe intent ids for every command family.

## Authority boundary

Use `GameRandom` as the application-level RNG port.

Rules:

- no direct `Math.random()` in craft / reroll / victory reward flows;
- use-cases resolve random outcome before repository write;
- repository persists already-resolved canonical outcome;
- retry after persistence conflict or replay must return persisted result, not a new roll.

## Flow rules

### Craft

- authoritative roll point: `CraftRune` use-case;
- canonical outcome: resolved `RuneDraft` passed into repository;
- retry rule: command retries must not invent a second random rune for the same successful write path.

### Reroll

- authoritative roll point: `RerollCurrentRuneStat` use-case;
- canonical outcome: resolved stat block passed into repository;
- retry rule: the persisted reroll result is the only authoritative one.

### Victory rune drop

- authoritative roll point: reward resolution before `finalizeBattle()` persistence;
- canonical outcome: dropped rune or `null` persisted inside battle reward payload / reward intent path;
- retry rule: finalize/recovery returns the already-persisted outcome.

## Tests required

- deterministic unit tests with stubbed `GameRandom` for craft / reroll / drop;
- battle finalize retry returns same drop payload;
- stale branch cannot overwrite with a different random result.

## Q-042 command-intent review

Closed by current command-intent and reward-ledger work:

- shipped `craftRune` commands now have replay receipts through `CommandIntentRecord` for keyboard payloads and server-owned legacy text intents;
- shipped `rerollRuneStat` commands now have replay receipts through `CommandIntentRecord` for keyboard payloads and server-owned legacy text intents;
- victory rune drops are not keyed by a standalone button intent, but the resolved drop is persisted in the battle reward payload / reward intent path and replayed through `finalizeBattle()` instead of rerolling;
- shipped `exploreLocation` entry now stores the selected event or battle outcome behind the exploration command receipt, so duplicate delivery of the same explore intent returns the canonical outcome.

Evidence anchors:

- `docs/platform/command-intent-rules.md`;
- `docs/platform/retry-handling-rules.md`;
- `docs/platform/generic-mutation-intent-envelope.md`;
- `docs/qa/reward-duplication-matrix.md`;
- `src/modules/shared/infrastructure/prisma/PrismaGameRepository.concurrency.test.ts` finalize/drop retry coverage.

## Deferred after Q-042 review

No longer deferred:

- idempotency keys for shipped craft/reroll commands;
- replay protection for the current shipped `exploreLocation` entry point.

Still deferred:

- generic mutation intent envelope implementation after the design in `docs/platform/generic-mutation-intent-envelope.md`;
- remaining text-command replay handling outside the guarded command families listed in `docs/platform/command-intent-rules.md`;
- RNG authority policy for future encounter-selection systems, combat damage, and other non-reward flows;
- receipt-owner decisions for any future reward-bearing random flow before runtime code lands.
