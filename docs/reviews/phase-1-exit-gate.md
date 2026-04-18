# Phase 1 Exit Gate — Foundation to Vertical Slice

## Purpose

Зафиксировать минимальное go/no-go решение между `Foundation & Platform` и `Vertical Slice` без дублирования уже существующих platform docs.

- Дата review: `2026-04-19`
- Primary owners: `Producer / Product`, `Gameplay / Platform`
- Support owners: `Game Design`, `Balance`, `Content / UX`, `QA / Release`
- Gate verdict: `iterate`
- Scope-lock verdict: `ship`

Итог: **scope Vertical Slice зафиксирован**, risky breadth вынесена из ближайшего delivery order, но **Phase 1 exit gate ещё не считается полностью закрытым**, пока не добиты product lock и player-state contract gaps.

## Exit criteria summary

| Exit criterion | Status | Decision | Evidence |
|---|---|---|---|
| Пиллары продукта согласованы и не конфликтуют друг с другом | `partial` | конфликтов в locked slice не осталось, но school bible / rarity ladder ещё не заморожены | `PLAN.md`, `README.md`, этот review |
| Platform contracts готовы к Vertical Slice | `partial` | battle/loadout/reward/retry baseline готов, но player-state versioning и split source-of-truth/read models ещё открыты | `ARCHITECTURE.md`, `docs/platform/*`, этот review |
| Vertical Slice scope заперт и не расползается | `done` | committed scope сведён к одному доказуемому school-first PvE journey | этот review, `PLAN.md` |
| High-risk out-of-scope вынесен из ближайшего delivery order | `done` | social-lite, PvP beyond locked slice и unsafe breadth явно вырезаны из near-term committed work | этот review, `PLAN.md` |

## Pillars consistency review

| Pillar | Как выражается в locked slice | Conflict check |
|---|---|---|
| `Basic attack is evergreen` | slice не требует насыщать бой множеством активных кнопок; базовая атака остаётся честным default-решением | ok |
| `Schools first` | Vertical Slice доказывает не breadth, а различимость двух школ | ok |
| `Rarity expands loadout breadth` | только один rarity/loadout breakpoint, без stat-inflation гонки | ok |
| `Synergy is earned depth` | slice ограничен starter synergy, без proc-web complexity | ok |
| `PvE-first` | committed scope — только один polished PvE journey | ok |
| `Social is asynchronous by default` | social layer не входит в committed Vertical Slice | ok |
| `PvP is optional and late` | PvP не входит в locked Vertical Slice; synchronous / mandatory forms вынесены из 1.0 scope, async candidate допускается только после отдельного evidence review | ok |
| `Ethical retention only` | return recap / next goals остаются curiosity-driven, без streak pressure | ok |

### Current tension points still open

- school bible v1 и overlap / uniqueness rules ещё не заморожены как production source-of-truth;
- rarity ladder v1 ещё не оформлена как locked ruleset;
- это не ломает scope lock, но пока не позволяет честно закрыть весь Phase 1 exit gate.

## Platform contract readiness

### Ready for Vertical Slice planning baseline

- `SchoolDefinition` как canonical player-facing school contract;
- `LoadoutSnapshot` для battle-owned rune loadout baseline;
- `RewardIntent` + `RewardLedger` для exact-once reward claim semantics;
- `BattleSnapshot` + `actionRevision` + retry/stale rails;
- `CommandIntentRecord` / `DeletePlayerReceipt` и command replay policy для shipped mutation paths;
- `GameRandom` authority для craft / reroll / reward-bearing randomness;
- content validation / concurrency regression floor в `docs/testing/concurrency-critical-use-cases.md` и `docs/qa/reward-duplication-matrix.md`.

### Not yet ready to mark fully green

- full player-state versioning;
- formal split between source-of-truth state and derived read models beyond current battle/loadout/reward boundaries;
- named retirement policy for legacy battle fallback columns.

### Accepted debt for this gate review

- Эти gaps **не должны расширять Vertical Slice scope**.
- Они **блокируют only full Phase 1 exit sign-off**, но не требуют нового platform feature burst прямо сейчас.
- Следующий contract-oriented slice должен быть document-first, а не schema-first, если нет нового real runtime risk.

## Vertical Slice committed scope v1

### Committed

- **1 polished early-to-mid PvE journey**:
  - onboarding;
  - первая активная руна;
  - первый school payoff;
  - первый build breakpoint;
  - честная цель на `3–5` сессий.
- **2 школы для доказательства различимости**:
  - `Пламя` — pressure / burst / risk-reward;
  - `Твердь` — стойкость / counter / stability.
- **1 loadout / rarity breadth step** без power-cliff inflation.
- **2 ранних PvE bands**.
- **2 elite encounter archetypes**.
- **1 miniboss slice**.
- return UX support:
  - `Следующая цель`;
  - return recap;
  - rune hub page/slot/equip flows внутри locked scope.

### Deferred until after Vertical Slice evidence

- `Буря` как полный school-v1 package;
- `Прорицание` как полный school-v1 package;
- full school trials breadth;
- boss breadth beyond one miniboss;
- broader targeted source families for every school;
- deeper economy / new currency layers.

## High-risk out-of-scope for near-term delivery

Эти темы **не считаются committed work** до отдельного review после Vertical Slice evidence:

- social-lite / circles / shared ritual;
- любой PvP внутри locked Vertical Slice, а также synchronous / mandatory PvP forms для 1.0;
- trading / prestige / расширение валютного слоя;
- полный quest runtime platform;
- season chronicle runtime / live-ops tooling;
- новые schema-expanding systems без прямого Vertical Slice payoff;
- попытка довести все `4` школы до одинаковой production-ready глубины в одном slice.

## Dependencies and accepted delivery debt

### Must close before full Phase 1 exit sign-off

- `11.1 Product lock`:
  - school bible / overlap rules / rarity ladder.
- `11.2 Domain platform`:
  - source-of-truth vs read-model split;
  - player-state versioning policy.

### Must not reopen scope lock

- новые школы не добавляются в committed Vertical Slice без formal cut trade;
- новые social/PvP promises не попадают в near-term order;
- новые economy/persistence expansions не добавляются без прямого доказуемого slice payoff.

## Evidence links

- `PLAN.md`
- `README.md`
- `docs/product/1-0-release-charter.md`
- `ARCHITECTURE.md`
- `docs/platform/persistence-versioning-rules.md`
- `docs/platform/retry-handling-rules.md`
- `docs/platform/command-intent-rules.md`
- `docs/platform/rng-authority-rules.md`
- `docs/testing/concurrency-critical-use-cases.md`
- `docs/qa/reward-duplication-matrix.md`
- `docs/content/content-pipeline-plan.md`
- `docs/telemetry/telemetry-plan.md`

## Decision summary

- **Можно** считать scope lock для Vertical Slice v1 зафиксированным.
- **Нельзя** считать Phase 1 exit gate полностью закрытым, пока product lock и player-state contract gaps не доведены до explicit sign-off.
