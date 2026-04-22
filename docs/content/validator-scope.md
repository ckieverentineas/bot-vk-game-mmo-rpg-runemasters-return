# Content Validator Scope v1

## Goal

Отделить:

- **hard blockers**, которые должны ломать validation/release;
- **warning-level checks**, которые требуют review, но не всегда block the build;
- **deferred checks**, которые появятся только после роста runtime/content platform.

## Validator tiers

### Tier 1 — Hard blockers

Срез не считается shippable, если нарушен хотя бы один пункт:

- broken references between content units;
- duplicate keys/codes;
- missing required school/archetype/ability fields;
- invalid reward or economy references;
- content package cannot render without fallback text in current shipped UX surfaces.

### Tier 2 — Warning-level checks

Не обязательно block build, но должны быть reviewed before ship:

- school package has weak tactical ask;
- enemy pressure exists but reward/chase hook is unclear;
- package is technically valid yet not completeness-safe for current roadmap promises.

### Tier 3 — Deferred checks

Пока не входят в mandatory validation:

- full encounter composition rules;
- automated weak encounter tactical ask warning, until runtime/content owns stable encounter package fields such as `tacticalAsk`, `enemyPressure`, and `schoolHook`;
- full quest scripting validation;
- season chronicle balancing coverage;
- live-ops schedule validation;
- deep telemetry completeness assertions.

## Required checks by content type

### Schools

- `SchoolDefinition` exists;
- school ↔ archetype wiring valid;
- player-facing copy fields non-empty;
- starter school package can be referenced by onboarding / rune / return presenters.
- shipped 4-school baseline must also have:
  - novice path definition;
  - novice enemy hook;
  - school miniboss continuation;
  - starter payoff resolvable through ability package;
  - reward/chase hook that survives validation without fallback assumptions.

### Enemies

- biome / source references valid;
- reward fields valid;
- readable threat/intent text present if enemy relies on telegraph readability.

### Encounters

- referenced enemies exist;
- threat band valid;
- encounter ask documented in package docs/review notes while no runtime encounter package shape exists.

Deferred warning rule:

- do not infer weak tactical ask from enemy `attackText`, school copy, or private runtime hint text alone;
- enable a warning-level validator only after encounter packages expose stable authored fields for tactical ask, enemy pressure, and school/readability hook.

### Quests

- trigger/source references valid;
- reward hook valid;
- quest points to an existing world/school lane.

### Season chronicle configs

- theme/id unique;
- linked content units exist;
- config does not point to out-of-scope runtime systems silently.

## Manual review vs automated validation

### Automated

- integrity;
- duplicates;
- required field presence;
- minimal completeness blockers.

### Manual review

- school fantasy clarity;
- encounter question readability, including weak tactical ask review until the runtime content shape can carry an explicit encounter ask;
- whether the reward/chase hook is genuinely motivating;
- whether the package is worth shipping now.

## Release policy

- Tier 1 failures block `content:validate` and release.
- Tier 2 findings require review note in the slice/doc/release conversation.
- Tier 3 checks are roadmap backlog, not release blockers today.

## Next step after v1

- expand completeness validators beyond school packages only after the 4-school baseline is stable;
- only expand to encounter/quest/season rules when those systems have runtime contracts;
- first encounter candidate: warning-level tactical ask validation once the content package owns explicit `tacticalAsk`, `enemyPressure`, and `schoolHook` fields.
