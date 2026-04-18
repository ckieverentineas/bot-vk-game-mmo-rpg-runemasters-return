# RNG Authority Rules v1

## Goal

Reward-relevant randomness must be resolved once on the server, before persistence, and the persisted outcome must stay canonical for retries, recovery, and review.

## In scope

- rune craft generation;
- rune stat reroll outcome;
- victory rune drop outcome.

## Out of scope

- combat damage randomness;
- encounter composition randomness;
- analytics/vendor specifics;
- full replay-safe intent ids for every command.

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

## Deferred after v1

- idempotency keys for craft/reroll commands;
- broader repeated-command dedupe outside current critical rails;
- RNG authority for encounter selection and other non-reward flows.
