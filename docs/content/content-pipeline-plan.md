# Content Pipeline Plan v1

## Goal

Зафиксировать минимальный production rail для content packages перед Vertical Slice scope lock, чтобы команда могла быстро отвечать на два вопроса:

- что считается ship-ready пакетом контента;
- какие проверки и review нужны до попадания такого пакета в релиз.

## Why now

Foundation phase уже получила:

- canonical `SchoolDefinition`;
- onboarding / next-goal / return recap UX rails;
- telemetry plan v1;
- базовую content validation rail.

Следующий риск теперь не в отсутствии отдельных правил, а в **content throughput и package completeness**. Нужен единый план, который связывает школы, врагов, encounters, quests и season chronicle configs в один authoring workflow без premature tooling.

## Scope

### In scope

- school package v1;
- enemy package expectations;
- encounter package expectations;
- quest package expectations;
- season chronicle config expectations;
- authoring flow;
- owner/review cadence;
- definition of done;
- link to validator scope.

### Out of scope

- CMS/editor tooling;
- full encounter DSL;
- full quest runtime platform;
- season/live-ops production tooling;
- migration of all existing seeds into a new folder structure today.

## Content units

### 1. School package

Минимальная unit of value для current product direction `schools first`.

School package считается осмысленным только если включает:

- school identity (`SchoolDefinition`);
- starter archetype;
- passive + active payoff или честное объяснение, почему active payoff отсутствует сейчас;
- enemy pressure, на который школа отвечает особенно хорошо;
- encounter ask / tactical question;
- reward/chase hook;
- onboarding / return / next-goal touchpoints;
- telemetry touchpoints;
- validator expectations.

### 2. Enemy package

Enemy package должен описывать:

- fantasy / combat role;
- pressure pattern;
- readable intent or threat language;
- school relevance (`what this enemy asks from the player`);
- reward/source role;
- validation requirements.

### 3. Encounter package

Encounter package для текущего плана пока остаётся thin contract:

- which enemies participate;
- intended tactical question;
- expected school/readability hook;
- threat band;
- reward/source hook;
- validation expectations.

### 4. Quest package

Quest package пока документируется как consumer school/enemy/encounter packages, а не как fully-fledged runtime spec.

Минимум:

- purpose;
- trigger/source;
- completion condition type;
- reward hook;
- connected school or world lane;
- validation expectations.

### 5. Season chronicle config

Только planning-level contract:

- season theme;
- linked schools/content lanes;
- content availability assumptions;
- reward/cosmetic intent;
- telemetry/review hooks.

## Authoring flow v1

1. **Draft package**
   - author writes/updates content package fields in docs/seeds.
2. **Validate package**
   - hard blockers from validator scope must pass.
3. **Cross-discipline review**
   - design: school readability / tactical ask;
   - UX: player-facing wording / next action clarity;
   - QA/release: abuse, duplication, rollback, release effect.
4. **Ship**
   - package lands only when release docs and validator scope are synced.

## School package completeness checklist v1

- [x] `SchoolDefinition` exists and is current.
- [x] starter archetype exists and matches school identity.
- [x] ability package supports the promised style.
- [x] at least one enemy pressure pattern calls for this school to answer cleanly.
- [x] at least one encounter ask is described.
- [x] reward/chase hook is documented.
- [x] onboarding / return / next-goal copy can mention the school without fallback text.
- [x] telemetry touchpoints exist in `docs/telemetry/telemetry-plan.md`.
- [x] validator scope covers both correctness and minimum completeness.

## Worked example — school package `Твердь`

### Identity

- school: `Твердь`
- archetype: `Страж`
- promise: переживает опасные ходы и отвечает защитой сильнее остальных.

### Tactical ask

- enemy telegraphs heavy or guard-sensitive pressure;
- school answer: protect, survive, punish the next window.

### Reward/chase hook

- early player should understand why a sturdier rune or defensive payoff matters for the next fight.

### UX hooks

- onboarding copy can explain that Твердь превращает защиту в реальное преимущество;
- next-goal and return recap can point back to the current defensive style.

### Validation ask

- school ↔ archetype linkage valid;
- promised payoff reflected in school copy and ability references;
- no missing encounter/enemy hook once encounter packages begin shipping.

## Worked example — encounter package `Таран у каменного пролома`

### Identity

- encounter code: `stonehorn-ram-novice-trial` (planning-level id, no runtime folder migration yet)
- school lane: `Твердь`
- enemy: `stonehorn-ram` (`Камнерогий таран`)
- threat band: early novice elite / `dark-forest`

### Enemy pressure

- `Камнерогий таран` is an elite heavy attacker with high health, attack, and defence for the early lane.
- The readable pressure is a telegraphed heavy hit: the player should see that blind attack trading is risky.
- The pressure asks for survival, guard value, and a defensive answer instead of raw race damage.

### Tactical ask

- Question: can the player read the heavy telegraph and answer with `защита` or `Каменный отпор` before committing to damage?
- Good school answer: `Твердь` / `Страж` survives the impact, builds guard value, then punishes the next safe window.
- Failure mode to watch: if normal attack spam wins just as clearly, encounter no longer teaches Твердь.

### Reward hook

- First aligned payoff: `UNUSUAL` stone sign from the novice path.
- Player-facing chase: "this sign makes the sturdy style real, not just a defensive label."
- Follow-up should push toward rune hub/equip sign, then a next fight that validates the sturdier build.

### Validation expectations

- referenced enemy `stonehorn-ram` exists and remains elite;
- school lane references `stone` / `Твердь`;
- threat band stays early and readable, not boss-scale;
- reward hook stays aligned with the school novice payoff;
- validator can still treat this as documented encounter ask until encounter runtime contracts exist.

## Dependencies and defers matrix

| Lane | Can ship now | Depends on later |
|---|---|---|
| Schools | yes | future additional archetypes per school |
| Enemies | yes | richer encounter composition |
| Encounters | planning contract only | runtime encounter system / DSL |
| Quests | planning contract only | quest platform / persistence / rewards |
| Season chronicle configs | planning contract only | live-ops tooling and schedule system |

## Ownership and review cadence

### Content authoring owner

- Content / UX with Gameplay review.

### Weekly review

- school readability;
- encounter asks and enemy pressure clarity;
- validator gaps blocking throughput;
- release impact if content rules changed.

### Escalation triggers

- package has identity but no readable tactical ask;
- validator catches correctness, but completeness is still unclear;
- package requires new runtime/tooling that is not yet approved.

## Definition of done

- [ ] Team can define what counts as one school/enemy/encounter/quest/season package.
- [ ] School package checklist is explicit.
- [ ] Dependencies and defers are documented.
- [ ] Validator scope doc exists and is linked.
- [x] README / PLAN / release checklist reference the plan where relevant.

## Next step after v1

- school package checklist теперь зеркалится package-level completeness validator'ом в `content:validate` для shipped 4-school baseline;
- add one quest or season chronicle package example once those lanes need a concrete authoring slice;
- only then decide whether runtime folders or authoring templates need migration.
