# Telemetry Plan v1

## Goal

Telemetry v1 должен отвечать на несколько product-вопросов без отдельной analytics-платформы и без event spam:

- onboarding стал понятнее или нет;
- игрок действительно доходит до первого school payoff;
- после battle result и return recap игрок понимает следующий шаг;
- build/loadout система используется, а не игнорируется;
- экономика выглядит честной;
- reward/retry rails не сигналят про exploit pressure.

## Scope

### In scope

- onboarding clarity;
- school pick rates;
- loadout change rates;
- economy health;
- exploit/retry signals.

### Out of scope

- vendor/tool choice;
- dashboards и warehouse design;
- clickstream на каждую кнопку;
- full retention BI;
- A/B framework;
- social / PvP / live-ops telemetry.

## Core product questions

1. Доходит ли игрок до первого meaningful school moment без ручных объяснений?
2. Понимает ли игрок следующий шаг после battle result?
3. Помогает ли return recap быстро вернуться к осмысленному действию?
4. Используют ли игроки rune/loadout систему после первого rune payoff?
5. Нет ли ранних economy / abuse сигналов, которые ломают доверие к прогрессу?

## Event map v1

Использовать существующий `GameLog(action, details, createdAt, userId)` как transport/storage rail до отдельной telemetry platform.

Все новые/формализованные события должны иметь `event_version: 1` в payload.

| Event | When | Key fields | Why it matters |
|---|---|---|---|
| `onboarding_started` | новый игрок реально вошёл в первый flow после создания персонажа | `entry_surface`, `tutorial_state`, `event_version` | базовая точка funnels |
| `tutorial_path_chosen` | игрок продолжает tutorial или skip | `choice`, `event_version` | сравнение tutorial vs skip |
| `first_school_presented` | school identity впервые показана как meaningful reward/context | `school_code`, `source`, `event_version` | понятность school-first framing |
| `first_school_committed` | первая школа стала реальной build identity игрока | `school_code`, `acquisition_source`, `tutorial_path`, `event_version` | читаемость школ и ранний pick distribution |
| `post_session_next_goal_shown` | battle result показал next-goal block | `battle_outcome`, `had_rune_drop`, `suggested_goal_type`, `event_version` | проверка качества post-session guidance и того, что battle result не расходится с каноническим next-goal read-model |
| `return_recap_shown` | existing player получил return recap | `entry_surface`, `has_equipped_rune`, `current_school_code`, `next_step_type`, `event_version` | clarity первого действия после return и качество school-aware guidance |
| `loadout_changed` | equip / unequip реально меняет committed loadout | `change_type`, `before_school_code`, `after_school_code`, `before_rarity`, `after_rarity`, `event_version` | engagement с rune/loadout loop |
| `economy_transaction_committed` | source/sink изменения зафиксированы | `transaction_type`, `source_type`, `resource_dust_delta`, `resource_shards_delta`, `rune_delta`, `player_level`, `event_version` | economy health и outliers |
| `reward_claim_applied` | canonical reward claim применён | `ledger_key`, `source_type`, `source_id`, `event_version` | exact-once reward health |
| `battle_stale_action_rejected` | stale battle mutation заблокирована | `battle_id`, `expected_revision`, `actual_revision`, `status`, `event_version` | exploit/UX confusion signal |

## Core metrics and decision checks

### Onboarding clarity

- `onboarding_started -> first_school_committed`
- time/order to first rune and first school presentation
- tutorial vs skip delta

Healthy signal:
- заметная доля новых игроков доходит до `first_school_committed` без провала между tutorial и first rune.

### Post-session clarity

- % completed battles with `post_session_next_goal_shown`
- next meaningful action after that block:
  - `open_runes`
  - `open_profile`
  - `start_battle`

Healthy signal:
- battle result screen не становится dead end; игрок делает хотя бы один follow-up step в той же или следующей сессии.
- `suggested_goal_type` чаще ведёт к осмысленному действию (`open_runes`, `start_battle`), а не к menu wandering.

### Return clarity

- `return_recap_shown -> first_action_after_return`
- bounce without meaningful action after recap

Healthy signal:
- return recap сокращает menu wandering и быстрее ведёт к первому осмысленному действию.
- school-aware `next_step_type` помогает быстрее дойти до ближайшего school payoff или support-slot payoff.

### School pick health

- distribution of `first_school_committed.school_code`

Watch signal:
- любая школа устойчиво выше ~45% ранней концентрации = review of copy/readability or balance.

### Loadout engagement

- `% игроков с хотя бы одним loadout_changed после first_school_committed`
- `% returning players who touch runes/loadout after recap`

Healthy signal:
- rune system используется как часть core loop, а не остаётся декоративным screen.

## Current runtime instrumentation snapshot

Уже заинструментированы в runtime:

- `onboarding_started`;
- `loadout_changed`;
- `return_recap_shown`;
- `post_session_next_goal_shown`.

Для `return_recap_shown` и `post_session_next_goal_shown` поля `next_step_type` / `suggested_goal_type` должны брать значения из canonical next-goal read-model, а не из ad-hoc transport strings. Текущий целевой набор значений:

- `complete_tutorial_battle`;
- `get_first_rune`;
- `equip_first_rune`;
- `use_active_rune_skill`;
- `reach_next_school_mastery`;
- `fill_support_slot`;
- `push_higher_threat`;
- `equip_dropped_rune`;
- `review_runes_after_defeat`.

### Economy and exploit health

- source/sink summary by `economy_transaction_committed`
- ratio and patterns for `reward_claim_applied`
- rate of `battle_stale_action_rejected`

Healthy signal:
- нет unexplained spikes по gain rate и нет роста retry/duplicate-related anomalies.

## Review rhythm and owners

### Weekly product / UX review

Owner:
- Content / UX

Review:
- onboarding funnel
- post-session next goal follow-up
- return recap action rate

Decision:
- `ship`, `iterate`, or `cut` copy/flow branches.

### Weekly balance / economy review

Owner:
- Balance / Gameplay

Review:
- school pick distribution
- loadout engagement by school
- early economy source/sink shape

Decision:
- tune school framing, rewards, or loadout prompts.

### Weekly QA / exploit review

Owner:
- QA / Release

Review:
- `reward_claim_applied`
- `battle_stale_action_rejected`
- suspicious economy outliers

Decision:
- no action / add exploit checks / harden guards.

## Instrumentation rules

- Stable event names only; do not rename casually.
- Log meaningful state transitions, not every button press.
- Prefer one semantic event over multiple near-duplicates.
- Avoid guilt/FOMO instrumentation language in event names and docs.
- If a gameplay/economy/UX slice changes player guidance materially, update this doc and `PLAN.md` / `RELEASE_CHECKLIST.md` together.

## Definition of done for telemetry v1

- [ ] Каждая ключевая question above сопоставлена хотя бы с одним event.
- [ ] Event names и required fields описаны.
- [ ] Onboarding / post-session / return / economy / exploit signals покрыты.
- [ ] Owner и weekly review cadence названы.
- [ ] Scope boundaries задокументированы, чтобы не разрастаться в analytics platform.

## Defer until later

- inactivity-bucket precision and cohort analytics;
- dashboards and alerting;
- vendor/platform integration;
- deep combat turn-by-turn telemetry;
- social / PvP / live-ops analytics;
- experimentation framework.
